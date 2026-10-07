/**
 * Pixely Partners - API Service Layer
 * 
 * Centraliza todas las llamadas al backend FastAPI
 */

// Use environment variable for API URL, fallback to localhost for development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// =============================================================================
// TIPOS DE RESPUESTA
// =============================================================================

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_email: string;
  tenant_id: string;
  ficha_cliente_id: string | null;
  logo_url: string | null;
  role: string | null;  // User role (admin, analyst, client)
}


export interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  logo_url?: string;
  client_id?: string;
  created_at?: string;
}

// =============================================================================
// API ERROR HANDLING
// =============================================================================

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * An expired session made every screen load empty (the backend answers 401) while the app
 * still showed the user as logged in. Watch every request: a 401 to our API on a request that
 * carried a token means the session is over — clear it and reload into the login screen.
 * The login call itself is exempt, so a wrong password still shows its normal error.
 */
export function installSessionGuard(): void {
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);
    if (response.status === 401 && getStoredToken()) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith(API_BASE_URL) && !url.endsWith('/token')) {
        logout();
        window.location.reload();
      }
    }
    return response;
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new ApiError(response.status, errorData.detail || 'Request failed');
  }
  return response.json();
}

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

const TOKEN_KEY = 'pixely_access_token';
const USER_KEY = 'pixely_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthResponse | null {
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function setStoredUser(user: AuthResponse): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// =============================================================================
// AUTH ENDPOINTS
// =============================================================================

/**
 * Login con email y password
 * POST /token (OAuth2 standard form)
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const formData = new URLSearchParams();
  formData.append('username', email); // OAuth2 uses 'username' field
  formData.append('password', password);

  const response = await fetch(`${API_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const data = await handleResponse<AuthResponse>(response);

  // Store token and user info
  setStoredToken(data.access_token);
  setStoredUser(data);

  // Store clientId for components that need it (Strategy, Kanban, etc.)
  if (data.ficha_cliente_id) {
    localStorage.setItem('clientId', data.ficha_cliente_id);
  }

  return data;
}

/**
 * Logout - clear stored credentials
 */
export function logout(): void {
  clearStoredToken();
  localStorage.removeItem('clientId');
}

/**
 * Get current user info
 * GET /users/me
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<UserInfo>(response);
}

// =============================================================================
// SEMANTIC ORCHESTRATOR ENDPOINTS
// =============================================================================

export interface Client {
  id: string;
  nombre: string;
  industry: string;
  is_active: boolean;
  created_at: string;
}

/**
 * Get all clients for current tenant
 * GET /clients/
 */
export async function getClients(): Promise<Client[]> {
  const response = await fetch(`${API_BASE_URL}/clients`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<Client[]>(response);
}

/**
 * Update client information
 * PUT /clients/{client_id}
 */
export async function updateClient(clientId: string, data: Partial<Client>): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Client>(response);
}

/**
 * Delete a client
 * DELETE /clients/{client_id}
 */
export async function deleteClient(clientId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Failed to delete client: ${response.statusText}`);
  }
}

// =============================================================================
// INTERVIEW ENDPOINTS
// =============================================================================

export async function saveInterview(clientId: string, data: any, file?: File | null): Promise<any> {
  const formData = new FormData();
  formData.append('client_id', clientId);
  formData.append('data', JSON.stringify(data));
  if (file) {
    formData.append('file', file);
  }

  const response = await fetch(`${API_BASE_URL}/clients/${clientId}/interview`, {
    method: 'PUT',
    headers: {
      // Do NOT set Content-Type here, let browser set it for multipart/form-data with boundary
      ...getAuthHeaders(),
    },
    body: formData,
  });
  return handleResponse(response);
}

/** A module built from the interview; `desactualizado` = generated before the interview's last update. */
export interface DownstreamModule {
  modulo: 'manual' | 'estrategia';
  nombre: string;
  generado_at: string;
  desactualizado: boolean;
}

export interface InterviewRecord {
  id?: string;
  data: Record<string, any>;
  updated_at?: string | null;
  downstream?: DownstreamModule[];
}

export async function getInterview(clientId: string): Promise<InterviewRecord> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}/interview`, {
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

// =============================================================================
// BRAND BOOK ENDPOINTS
// =============================================================================

/**
 * Get Brand Identity
 * GET /clients/{client_id}/brand
 */
export async function getBrand(clientId: string): Promise<{ status: string; data: any; brand_name?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/brand/${clientId}`, {
      headers: getAuthHeaders(),
    });

    // Handle 404 specially as "empty"
    if (response.status === 404) {
      return { status: "empty", data: null };
    }

    const responseData = await handleResponse<any>(response);
    return responseData;
  } catch (error) {
    console.error("Error fetching brand:", error);
    return { status: "error", data: null };
  }
}

export async function updateBrand(clientId: string, data: any): Promise<{ status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/brand/${clientId}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

export type VozEstado = 'Pendiente' | 'Aprobada' | 'Cambios solicitados';

export interface BrandVoice {
  tone_traits?: { trait: string; description?: string; desc?: string; ejemplo_si?: string; ejemplo_no?: string }[] | null;
  palabras_si?: string[] | null;
  palabras_no?: string[] | null;
  archetype?: string | null;
  arquetipo_razon?: string | null;
  ejemplo_post?: string | null;
  colors?: { primary?: string; secondary?: string; accent?: string; background?: string } | null;
  logo_url?: string | null;
  voz_estado?: VozEstado;
  voz_comentario?: string | null;
  voz_revisada_at?: string | null;
  updated_at?: string | null;
}

export async function reviewBrandVoice(clientId: string, estado: Exclude<VozEstado, 'Pendiente'>, comentario?: string): Promise<Partial<BrandVoice>> {
  const response = await fetch(`${API_BASE_URL}/brand/${clientId}/voice/review`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, comentario: comentario ?? null }),
  });
  const result = await handleResponse<{ status: string; data: Partial<BrandVoice> }>(response);
  return result.data;
}

export async function updateBrandColors(clientId: string, colors: NonNullable<BrandVoice['colors']>): Promise<NonNullable<BrandVoice['colors']>> {
  const response = await fetch(`${API_BASE_URL}/brand/${clientId}/colors`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ colors }),
  });
  const result = await handleResponse<{ status: string; data: NonNullable<BrandVoice['colors']> }>(response);
  return result.data;
}

// =============================================================================
// STRATEGY ENDPOINTS
// =============================================================================

export interface StrategyNode {
  id: string;
  type: string;
  label: string;
  description?: string;
  parentId?: string | null;
  x: number;
  y: number;
  tags?: string[];
}

export async function getStrategy(clientId: string): Promise<StrategyNode[]> {
  const response = await fetch(`${API_BASE_URL}/strategy/${clientId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function syncStrategy(clientId: string, nodes: StrategyNode[]): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/strategy/sync`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ client_id: clientId, nodes }),
  });
  return handleResponse(response);
}

export type EstrategiaEstado = 'Pendiente' | 'Aprobada' | 'Cambios solicitados';

export interface StrategyReview {
  estado: EstrategiaEstado;
  comentario: string | null;
  revisada_at: string | null;
  revisada_por: string | null;
}

export async function getStrategyReview(clientId: string): Promise<StrategyReview> {
  const response = await fetch(`${API_BASE_URL}/strategy/${clientId}/review`, { headers: getAuthHeaders() });
  const result = await handleResponse<{ status: string; data: StrategyReview }>(response);
  return result.data;
}

export async function reviewStrategy(clientId: string, estado: Exclude<EstrategiaEstado, 'Pendiente'>, comentario?: string): Promise<StrategyReview> {
  const response = await fetch(`${API_BASE_URL}/strategy/${clientId}/review`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, comentario: comentario ?? null }),
  });
  const result = await handleResponse<{ status: string; data: StrategyReview }>(response);
  return result.data;
}

// =============================================================================
// MARKET (FASE MERCADO) ENDPOINTS
// =============================================================================
// Read-only: the génesis study and the recurring scan are run by hand from
// Claude Desktop (lam218313-beep/Pixely_Automatizaciones), never from here.

export interface CompetitorEntry {
  nombre: string;
  categoria?: string;
  direccion?: string;
  telefono?: string;
  website?: string;
  rating?: number;
  reseñas?: number;
  place_id?: string;
}

export interface MarketStudy {
  id: string;
  client_id: string;
  ciudad: string | null;
  rubro: string | null;
  fecha_estudio: string | null;
  version: string | null;
  universo_competidores: {
    total_detectado_maps?: number;
    total_relevante_filtrado?: number;
    listado?: CompetitorEntry[];
  } | null;
  dossier_profundo: any[] | null;
  tamano_mercado: {
    metodo_top_down?: any;
    metodo_bottom_up?: any;
    cruce_de_metodos?: string;
  } | null;
  panorama_producto_precio: any | null;
  notas_metodologicas: any | null;
  pdf_url: string | null;
  created_at: string;
}

export type MarketFindingCluster = 'Problema' | 'Identidad' | 'Prueba';
export type MarketFindingConfianza = 'Alta' | 'Media' | 'Baja';

export interface MarketFinding {
  id: string;
  client_id: string;
  fecha: string;
  fuente: string | null;
  tema: string | null;
  dato_o_angulo: string | null;
  evidencia: string | null;
  cluster: MarketFindingCluster | null;
  confianza: MarketFindingConfianza | null;
  tipo_senal: string | null;
  competidor: string | null;
  link: string | null;
}

export async function getMarketStudy(clientId: string): Promise<MarketStudy | null> {
  const response = await fetch(`${API_BASE_URL}/market/${clientId}/study`, {
    headers: getAuthHeaders(),
  });
  const result = await handleResponse<{ status: string; data: MarketStudy | null }>(response);
  return result.data;
}

/** "Tu mercado" as a PDF, built on the fly from the study and the current findings. Triggers the download. */
export async function downloadMarketReport(clientId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/market/${clientId}/report.pdf`, { headers: getAuthHeaders() });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'No se pudo generar el PDF' }));
    throw new ApiError(response.status, err.detail || 'No se pudo generar el PDF');
  }
  const blob = await response.blob();
  const name = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '')?.[1] ?? 'mercado.pdf';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getMarketFindings(clientId: string): Promise<MarketFinding[]> {
  const response = await fetch(`${API_BASE_URL}/market/${clientId}/findings`, {
    headers: getAuthHeaders(),
  });
  const result = await handleResponse<{ status: string; data: MarketFinding[] }>(response);
  return result.data;
}

// =============================================================================
// CONTENT PIECES (Repositorio / Validación / Publicación)
// Filled by the Claude Desktop pipeline: 02 crea, 03 copy, 04 render, 05 publica.
// =============================================================================

export type ContentFormato = 'Imagen' | 'Carrusel' | 'Estado' | 'Reel';
export type ContentPilar = 'Problema' | 'Identidad' | 'Prueba';
export type ContentAprobacion = 'Pendiente' | 'Aprobado' | 'Cambios solicitados';

/** One slide (Carrusel) or scene (Reel) of a planned idea, in words. */
export interface PieceStep {
  n: number;
  titulo: string;
  detalle?: string | null;
}

export interface ContentPiece {
  id: string;
  client_id: string;
  fecha: string;
  formato: ContentFormato | null;
  pilar: ContentPilar | null;
  topico_angulo: string | null;
  marcador: 'I' | 'C' | null;
  estado_copy: string | null;
  estado_render: string | null;
  estado_publicado: string | null;
  estado_aprobacion: ContentAprobacion;
  comentario_cliente: string | null;
  revisado_at: string | null;
  revisado_por: string | null;
  copy_instagram: string | null;
  copy_linkedin: string | null;
  copy_pinterest: string | null;
  copy_gbp: string | null;
  copy_x: string | null;
  prompt_visual: string | null;  // English Magnific prompt, or the reel script when formato = 'Reel'
  url_imagen: string | null;
  url_piezas_finales: string[] | null;
  // Written by /05_planificacion: what the piece is for, copied when the plan was made
  concepto_id: string | null;   // strategy_nodes id of the main concept it serves (= concepto_ids[0])
  concepto_ids: string[] | null; // every concept the piece combines, main one first
  concepto: string | null;
  objetivo: string | null;
  evidencia: string | null;     // market fact behind an [I] piece, with its source
  razon: string | null;         // why the piece exists: how objective, strategy, concept and evidence became this piece
  descripcion_visual: string | null; // what the piece will show and tell, in Spanish (written by /05_planificacion; older plans by /03_generar)
  estructura: PieceStep[] | null;    // Carrusel slides or Reel scenes in words, written by /05_planificacion
  // The client's decision on the idea, in Planificación (before production)
  plan_estado: PlanEstado;
  plan_comentario: string | null;
  plan_revisado_at: string | null;
  plan_revisado_por: string | null;
  // Validación and post-production
  cambio_tipo: CambioTipo | null;    // what the client asked to change: image (designer), text (/03_generar) or both
  guia_produccion: string | null;    // the designer's brief, written by /04_ensamblar
  canva_url: string | null;          // editable Canva draft left by /04_ensamblar
  generada_con_ia: boolean | null;   // set by whoever uploads the finals
  entregada_at: string | null;
  entregada_por: string | null;
  publicada_at: string | null;   // exact date-time scheduled in Metricool (/05_publicar)
  metricool_uuid: string | null;
  created_at: string;
}

export type PlanEstado = 'Pendiente' | 'Aprobada' | 'Cambios solicitados';
export type CambioTipo = 'imagen' | 'texto' | 'ambos';

/** The client approves (or sends back) one idea of the plan, before it is produced. */
export async function reviewPlanPiece(clientId: string, pieceId: string, estado: Exclude<PlanEstado, 'Pendiente'>, comentario?: string): Promise<ContentPiece> {
  const response = await fetch(`${API_BASE_URL}/content/${clientId}/pieces/${pieceId}/plan-review`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, comentario: comentario ?? null }),
  });
  const result = await handleResponse<{ status: string; data: ContentPiece }>(response);
  return result.data;
}

/** Approves every idea of the month still waiting for the client; returns the pieces it changed. */
export async function approvePendingPlan(clientId: string, month: string): Promise<ContentPiece[]> {
  const response = await fetch(`${API_BASE_URL}/content/${clientId}/plan-review/approve-pending?month=${encodeURIComponent(month)}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const result = await handleResponse<{ status: string; data: ContentPiece[] }>(response);
  return result.data;
}

// --- Results (Metricool), shown in Publicaciones ---

export type MetricRed = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'pinterest' | 'gbp' | 'youtube' | 'x';

export interface PieceMetric {
  piece_id: string;
  red: MetricRed;
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
  actualizado_at: string;
}

export interface CompetitorBenchmark {
  mes: string;
  red: 'instagram' | 'facebook' | 'youtube' | 'x';
  competidor: string;
  seguidores: number | null;
  posts: number | null;
  reels: number | null;
  interacciones_prom: number | null;  // average likes + comments per publication that month
  engagement: number | null;
  actualizado_at: string;
}

export async function getResults(clientId: string, month: string): Promise<{ metrics: PieceMetric[]; competitors: CompetitorBenchmark[] }> {
  const response = await fetch(`${API_BASE_URL}/content/${clientId}/results?month=${encodeURIComponent(month)}`, { headers: getAuthHeaders() });
  const result = await handleResponse<{ status: string; data: { metrics: PieceMetric[]; competitors: CompetitorBenchmark[] } }>(response);
  return result.data;
}

// --- Admin "Hoy" board ---

export type PasoEstado = 'falta' | 'cliente' | 'cambios' | 'listo';
export type AdminDestino = 'configuracion' | 'ficha' | 'voz' | 'mercado' | 'estrategia' | 'planificacion' | 'validacion' | 'publicaciones';

export interface AdminAccion {
  quien: 'equipo' | 'cliente';
  texto: string;
  n: number;
  receta: string | null;
  destino: AdminDestino | null;
}

export interface AdminMarca {
  id: string;
  nombre: string;
  usuarios: number;
  config: { plan: string | null; fotos_mes: number | null; reels_mes: number | null; redes: BrandRed[]; metricool: boolean; completa: boolean };
  pasos: { ficha: PasoEstado; mercado: PasoEstado; voz: PasoEstado; estrategia: PasoEstado };
  contenido: { mes: string; plan_mes: number; plan_siguiente: number; ideas_pendientes: number; ideas_cambios: number; en_produccion: number; por_revisar: number; por_programar: number };
  ultima_vigilancia: string | null;
  ultimos_resultados: string | null;
  acciones: AdminAccion[];
}

export type BrandRed = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'pinterest' | 'gbp' | 'x';
export type BrandPlan = 'Lite' | 'Basic' | 'Pro' | 'Personalizado';

/** The brand's setup, edited by the team; the recipes read volume, networks and Metricool from here. */
export interface BrandSettings {
  plan: BrandPlan | null;
  fotos_mes: number | null;
  reels_mes: number | null;
  redes: BrandRed[];
  metricool_brand_id: string | null;
  /** The brand's name in Metricool; the recipes find its id from it. */
  metricool_nombre?: string | null;
  ciudad: string | null;
  rubro: string | null;
  contacto_nombre: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  actualizado_at?: string;
  actualizado_por?: string | null;
}

export async function getBrandSettings(clientId: string): Promise<BrandSettings> {
  const response = await fetch(`${API_BASE_URL}/api/admin/brands/${clientId}/settings`, { headers: getAuthHeaders() });
  const result = await handleResponse<{ status: string; data: BrandSettings }>(response);
  return result.data;
}

export async function saveBrandSettings(clientId: string, settings: BrandSettings): Promise<BrandSettings> {
  const response = await fetch(`${API_BASE_URL}/api/admin/brands/${clientId}/settings`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  const result = await handleResponse<{ status: string; data: BrandSettings }>(response);
  return result.data;
}

/** Creates an empty brand (team only); its setup and users are added right after. */
export async function createAdminBrand(nombre: string): Promise<{ id: string; nombre: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/brands`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre }),
  });
  return handleResponse(response);
}

/** Gives a person access to one brand as its client. */
export async function createBrandUser(brandId: string, user: { email: string; password: string; full_name?: string }): Promise<{ id: string; email: string }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/brands/${brandId}/users`, {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return handleResponse(response);
}

export async function getAdminOverview(): Promise<{ hoy: string; marcas: AdminMarca[] }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/overview`, { headers: getAuthHeaders() });
  const result = await handleResponse<{ status: string; data: { hoy: string; marcas: AdminMarca[] } }>(response);
  return result.data;
}

export async function getContentPieces(clientId: string, month?: string): Promise<ContentPiece[]> {
  const query = month ? `?month=${encodeURIComponent(month)}` : '';
  const response = await fetch(`${API_BASE_URL}/content/${clientId}/pieces${query}`, {
    headers: getAuthHeaders(),
  });
  const result = await handleResponse<{ status: string; data: ContentPiece[] }>(response);
  return result.data;
}

export async function reviewContentPiece(
  clientId: string,
  pieceId: string,
  estado: Exclude<ContentAprobacion, 'Pendiente'>,
  comentario?: string,
  cambioTipo?: CambioTipo,
): Promise<ContentPiece> {
  const response = await fetch(`${API_BASE_URL}/content/${clientId}/pieces/${pieceId}/review`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado, comentario, cambio_tipo: cambioTipo ?? null }),
  });
  const result = await handleResponse<{ status: string; data: ContentPiece }>(response);
  return result.data;
}

/** Team only: uploads the finished files of a piece (after post-production); it then appears in Validación. */
export async function uploadPieceFinals(clientId: string, pieceId: string, files: File[], generadaConIa: boolean): Promise<ContentPiece> {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  form.append('generada_con_ia', String(generadaConIa));
  const response = await fetch(`${API_BASE_URL}/content/${clientId}/pieces/${pieceId}/finals`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  const result = await handleResponse<{ status: string; data: ContentPiece }>(response);
  return result.data;
}

