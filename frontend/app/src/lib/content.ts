/**
 * The brand's content pieces: one request shared by Plan, Validar and the tab badges.
 * Decisions (aprobar, pedir cambios) update the screen at once and are confirmed by the
 * server right after; if the server says no, the screen goes back to what it was.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useClientId } from './auth';
import { todayISO } from './dates';
import type { Aprobacion, CambioTipo, ContentPiece, PlanEstado } from './types';

const key = (clientId: string) => ['pieces', clientId] as const;

export function usePieces() {
  const clientId = useClientId();
  return useQuery({
    queryKey: key(clientId),
    queryFn: () => api.get<ContentPiece[]>(`/content/${clientId}/pieces`),
    select: (pieces) => [...pieces].sort((a, b) => a.fecha.localeCompare(b.fecha)),
  });
}

// --- Where a piece stands, from the client's point of view ---

/** Only http(s) links are ever rendered as src/href. */
const safe = (u?: string | null) => (u && /^https?:\/\//i.test(u) ? u : null);

export function finalAssets(p: ContentPiece): string[] {
  return (p.url_piezas_finales ?? []).map(safe).filter((u): u is string => !!u);
}
export const isVideo = (url: string) => /\.(mp4|mov|webm)$/i.test(url.split(/[?#]/)[0]);

export type Stage = 'produccion' | 'revision' | 'cambios' | 'aprobada' | 'programada' | 'publicada';

export function pieceStage(p: ContentPiece, today = todayISO()): Stage {
  if (p.estado_publicado && p.estado_publicado !== 'Pendiente') return p.fecha.slice(0, 10) < today ? 'publicada' : 'programada';
  if (finalAssets(p).length === 0) return 'produccion';
  if (p.estado_aprobacion === 'Aprobado') return 'aprobada';
  if (p.estado_aprobacion === 'Cambios solicitados') return 'cambios';
  return 'revision';
}

export const planEstado = (p: ContentPiece): PlanEstado => p.plan_estado ?? 'Pendiente';
/** Once the copy is written the idea is in production and can no longer change in Plan. */
export const canReviewPlan = (p: ContentPiece) => (p.estado_copy ?? 'Pendiente') === 'Pendiente';
export const awaitsPlan = (p: ContentPiece) => planEstado(p) === 'Pendiente' && canReviewPlan(p);

/** Networks with copy, in the order the client knows them. Instagram's text also goes to Facebook and TikTok. */
export const COPY_FIELDS = [
  { key: 'copy_instagram', label: 'Instagram' },
  { key: 'copy_linkedin', label: 'LinkedIn' },
  { key: 'copy_pinterest', label: 'Pinterest' },
  { key: 'copy_gbp', label: 'Google' },
  { key: 'copy_x', label: 'X' },
] as const;

export function pieceCopies(p: ContentPiece): { label: string; text: string }[] {
  return COPY_FIELDS.filter(({ key }) => !!p[key]).map(({ key, label }) => ({ label, text: p[key] as string }));
}

// --- Decisions ---

function useOptimistic<V>(apply: (p: ContentPiece, v: V) => ContentPiece | null, send: (clientId: string, v: V) => Promise<ContentPiece | ContentPiece[]>) {
  const clientId = useClientId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: V) => send(clientId, v),
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: key(clientId) });
      const before = qc.getQueryData<ContentPiece[]>(key(clientId));
      qc.setQueryData<ContentPiece[]>(key(clientId), (list) => list?.map((p) => apply(p, v) ?? p));
      return { before };
    },
    onError: (_e, _v, ctx) => { if (ctx?.before) qc.setQueryData(key(clientId), ctx.before); },
    onSuccess: (saved) => {
      const rows = Array.isArray(saved) ? saved : [saved];
      const byId = new Map(rows.filter(Boolean).map((r) => [r.id, r]));
      qc.setQueryData<ContentPiece[]>(key(clientId), (list) => list?.map((p) => (byId.has(p.id) ? { ...p, ...byId.get(p.id)! } : p)));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(clientId) }),
  });
}

export interface PieceDecision { id: string; estado: Exclude<Aprobacion, 'Pendiente'>; comentario?: string; cambioTipo?: CambioTipo }

/** Validar: the finished piece. */
export function useReviewPiece() {
  return useOptimistic<PieceDecision>(
    (p, v) => (p.id === v.id ? { ...p, estado_aprobacion: v.estado, comentario_cliente: v.comentario ?? null, cambio_tipo: v.cambioTipo ?? null } : null),
    (clientId, v) => api.patch<ContentPiece>(`/content/${clientId}/pieces/${v.id}/review`, { estado: v.estado, comentario: v.comentario ?? null, cambio_tipo: v.cambioTipo ?? null }),
  );
}

export interface IdeaDecision { id: string; estado: Exclude<PlanEstado, 'Pendiente'>; comentario?: string }

/** Plan: one idea. */
export function useReviewIdea() {
  return useOptimistic<IdeaDecision>(
    (p, v) => (p.id === v.id ? { ...p, plan_estado: v.estado, plan_comentario: v.comentario ?? p.plan_comentario } : null),
    (clientId, v) => api.patch<ContentPiece>(`/content/${clientId}/pieces/${v.id}/plan-review`, { estado: v.estado, comentario: v.comentario ?? null }),
  );
}

/** Plan: every idea of the month still waiting. */
export function useApprovePending() {
  return useOptimistic<string>(
    (p, month) => (p.fecha.startsWith(month) && awaitsPlan(p) ? { ...p, plan_estado: 'Aprobada' } : null),
    (clientId, month) => api.post<ContentPiece[]>(`/content/${clientId}/plan-review/approve-pending?month=${encodeURIComponent(month)}`),
  );
}

/** Counts for the tab bar bubbles. */
export function useTabBadges() {
  const { data } = usePieces();
  if (!data) return {};
  return {
    plan: data.filter(awaitsPlan).length,
    validar: data.filter((p) => pieceStage(p) === 'revision').length,
  };
}
