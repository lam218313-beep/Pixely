/** The backend's shapes the client app reads (same tables as Partners de escritorio). */

export type Formato = 'Imagen' | 'Carrusel' | 'Estado' | 'Reel';
export type Pilar = 'Problema' | 'Identidad' | 'Prueba';
export type Aprobacion = 'Pendiente' | 'Aprobado' | 'Cambios solicitados';
export type PlanEstado = 'Pendiente' | 'Aprobada' | 'Cambios solicitados';
export type CambioTipo = 'imagen' | 'texto' | 'ambos';

export interface PieceStep { n: number; titulo: string; detalle?: string | null }

export interface ContentPiece {
  id: string;
  client_id: string;
  fecha: string;
  formato: Formato | null;
  pilar: Pilar | null;
  topico_angulo: string | null;
  marcador: 'I' | 'C' | null;
  estado_copy: string | null;
  estado_render: string | null;
  estado_publicado: string | null;
  estado_aprobacion: Aprobacion | null;
  comentario_cliente: string | null;
  cambio_tipo: CambioTipo | null;
  copy_instagram: string | null;
  copy_linkedin: string | null;
  copy_pinterest: string | null;
  copy_gbp: string | null;
  copy_x: string | null;
  url_imagen: string | null;
  url_piezas_finales: string[] | null;
  concepto_id: string | null;
  concepto_ids: string[] | null;
  concepto: string | null;
  objetivo: string | null;
  evidencia: string | null;
  razon: string | null;
  descripcion_visual: string | null;
  estructura: PieceStep[] | null;
  plan_estado: PlanEstado | null;
  plan_comentario: string | null;
  publicada_at: string | null;
}

export interface StrategyNode {
  id: string;
  type: string;
  label: string;
  description?: string;
  parentId?: string | null;
  tags?: string[];
}
