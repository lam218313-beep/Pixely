/** Resultados: what Metricool brought back for each published piece, and the competitors' monthly averages. */
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useClientId } from './auth';

export interface PieceMetric {
  piece_id: string;
  red: string;
  post_url: string | null;
  publicado_at: string | null;
  alcance: number | null;
  vistas: number | null;
  interacciones: number | null;
  likes: number | null;
  comentarios: number | null;
  guardados: number | null;
  compartidos: number | null;
  nuevos_seguidores: number | null;
}
export interface Benchmark { mes: string; red: string; competidor: string; interacciones_prom: number | null; seguidores: number | null }

export function useResults(month: string) {
  const clientId = useClientId();
  return useQuery({
    queryKey: ['results', clientId, month],
    queryFn: () => api.get<{ metrics: PieceMetric[]; competitors: Benchmark[] }>(`/content/${clientId}/results?month=${month}`),
  });
}

export type Totals = Record<'alcance' | 'vistas' | 'interacciones' | 'likes' | 'comentarios' | 'guardados' | 'compartidos' | 'nuevos_seguidores', number>;
const KEYS: (keyof Totals)[] = ['alcance', 'vistas', 'interacciones', 'likes', 'comentarios', 'guardados', 'compartidos', 'nuevos_seguidores'];

/** Adds up every network of one piece (or of several). */
export function sumMetrics(rows: PieceMetric[]): Totals {
  const t = Object.fromEntries(KEYS.map((k) => [k, 0])) as Totals;
  rows.forEach((r) => KEYS.forEach((k) => { t[k] += r[k] ?? 0; }));
  return t;
}

export const fmt = (n: number) => n.toLocaleString('es-PE');
