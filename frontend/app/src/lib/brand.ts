/** Marca: the voice, the strategy's approval, the market and the ficha (all read-only except approving). */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, requestFile } from './api';
import { useClientId } from './auth';
import { shareFile } from './native';

export type Revision = 'Pendiente' | 'Aprobada' | 'Cambios solicitados';

export interface Trait { trait: string; description?: string; desc?: string; ejemplo_si?: string; ejemplo_no?: string }
export interface BrandVoice {
  tone_traits?: Trait[] | null;
  palabras_si?: string[] | null;
  palabras_no?: string[] | null;
  archetype?: string | null;
  arquetipo_razon?: string | null;
  ejemplo_post?: string | null;
  voz_estado?: Revision;
  voz_comentario?: string | null;
}

/** The voice exists once /02_voz_de_marca wrote its traits or archetype. */
export const hasVoice = (v: BrandVoice | null | undefined): v is BrandVoice => !!v && (!!v.tone_traits?.length || !!v.archetype);

export function useBrand() {
  const clientId = useClientId();
  return useQuery({
    queryKey: ['brand', clientId],
    queryFn: async () => {
      const r = await api.raw<{ status: string; data: BrandVoice | null; brand_name?: string }>(`/brand/${clientId}`).catch((e) => {
        if (e?.status === 404) return { status: 'empty', data: null, brand_name: undefined };
        throw e;
      });
      return { voice: r.status === 'success' ? r.data : null, name: r.brand_name ?? null };
    },
    staleTime: 5 * 60_000,
  });
}

export function useReviewVoice() {
  const clientId = useClientId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { estado: Exclude<Revision, 'Pendiente'>; comentario?: string }) => api.patch<Partial<BrandVoice>>(`/brand/${clientId}/voice/review`, { estado: v.estado, comentario: v.comentario ?? null }),
    onSuccess: (saved) => qc.setQueryData<{ voice: BrandVoice | null; name: string | null }>(['brand', clientId], (b) => (b?.voice ? { ...b, voice: { ...b.voice, ...saved } } : b)),
    onSettled: () => qc.invalidateQueries({ queryKey: ['brand', clientId] }),
  });
}

export interface StrategyReview { estado: Revision; comentario: string | null; revisada_at: string | null }

export function useStrategyReview() {
  const clientId = useClientId();
  return useQuery({ queryKey: ['strategy-review', clientId], queryFn: () => api.get<StrategyReview>(`/strategy/${clientId}/review`) });
}

export function useReviewStrategy() {
  const clientId = useClientId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { estado: Exclude<Revision, 'Pendiente'>; comentario?: string }) => api.patch<StrategyReview>(`/strategy/${clientId}/review`, { estado: v.estado, comentario: v.comentario ?? null }),
    onSuccess: (saved) => qc.setQueryData(['strategy-review', clientId], saved),
  });
}

export interface Competitor { nombre: string; rating?: number; reseñas?: number; categoria?: string }
export interface MarketStudy {
  ciudad: string | null;
  rubro: string | null;
  fecha_estudio: string | null;
  universo_competidores: { total_detectado_maps?: number; total_relevante_filtrado?: number; listado?: Competitor[] } | null;
  dossier_profundo: { competidor?: string; estadisticas_precio?: { min?: number; max?: number; promedio?: number } }[] | null;
  tamano_mercado: { rango_estimado?: { min?: number; max?: number; moneda?: string; periodo?: string }; cruce_de_metodos?: string } | null;
}
export interface Finding {
  id: string;
  fecha: string;
  fuente: string | null;
  tema: string | null;
  dato_o_angulo: string | null;
  cluster: 'Problema' | 'Identidad' | 'Prueba' | null;
  confianza: 'Alta' | 'Media' | 'Baja' | null;
  tipo_senal: string | null;
  competidor: string | null;
}

export function useMarket() {
  const clientId = useClientId();
  const study = useQuery({ queryKey: ['market-study', clientId], queryFn: () => api.get<MarketStudy | null>(`/market/${clientId}/study`), staleTime: 10 * 60_000 });
  const findings = useQuery({
    queryKey: ['market-findings', clientId],
    queryFn: () => api.get<Finding[]>(`/market/${clientId}/findings`),
    select: (f) => [...f].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    staleTime: 10 * 60_000,
  });
  return { study, findings };
}

/** Downloads "Tu mercado" as a PDF. On phones that can, it opens the share sheet instead. */
export async function downloadMarketPdf(clientId: string): Promise<void> {
  const { blob, name } = await requestFile(`/market/${clientId}/report.pdf`);
  const fileName = name ?? 'mercado.pdf';
  if (await shareFile(blob, fileName, 'Tu mercado').catch(() => false)) return;
  const file = new File([blob], fileName, { type: 'application/pdf' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try { await nav.share({ files: [file], title: 'Tu mercado' }); return; } catch { /* closed: fall back to download */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface Interview { data: Record<string, unknown>; updated_at?: string | null }

export function useInterview() {
  const clientId = useClientId();
  return useQuery({ queryKey: ['interview', clientId], queryFn: () => api.get<Interview>(`/clients/${clientId}/interview`), staleTime: 30 * 60_000 });
}
