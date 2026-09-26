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
  ficha_cliente_id: string | null;
  logo_url: string | null;
  role: string | null;  // User role (admin, analyst, client)
  plan: string;         // Subscription plan
  plan_expires_at: string | null;
  benefits: string[];   // Enabled benefits
}


export interface UserInfo {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  logo_url?: string;
  client_id?: string;
  plan?: string;
  plan_expires_at?: string;
  benefits?: string[];
  created_at?: string;
}

export interface ContextStatus {
  status: 'active' | 'no_context' | 'processing' | 'scraping' | 'classifying' | 'aggregating';
  context_id?: string;
  cache_active: boolean;
  cache_name?: string;
  last_updated?: string;
  files: Array<{
    id: string;
    filename: string;
    category: string;
    uploaded_at: string;
  }>;
}

// =============================================================================
// Q1-Q10 ANALYSIS RESPONSE TYPES
// =============================================================================

export interface Q1EmotionData {
  name: string;
  value: number;
}

export interface Q1Response {
  emociones: Q1EmotionData[];
}

export interface Q2PersonalityData {
  Sinceridad: number;
  Emocion: number;
  Competencia: number;
  Sofisticacion: number;
  Rudeza: number;
}

export interface Q2Response {
  resumen_global_personalidad: Q2PersonalityData;
}

export interface Q3TopicData {
  topic: string;
  frecuencia_relativa: number;
  sentimiento_promedio: number;
  palabras_clave?: string[];
}

export interface Q3Response {
  results: {
    analisis_agregado: Q3TopicData[];
  };
}

export interface Q4FrameDistribution {
  Positivo: number;
  Negativo: number;
  Aspiracional: number;
}

export interface Q4EvolutionPoint {
  semana: number;
  marcos_distribucion: Q4FrameDistribution;
}

export interface Q4Response {
  results: {
    analisis_agregado: Q4FrameDistribution;
    evolucion_temporal: Q4EvolutionPoint[];
  };
}

export interface Q5Influencer {
  username: string;
  autoridad_promedio: number;
  afinidad_promedio: number;
  menciones: number;
  score_centralidad: number;
  sentimiento: number;
  comentario_evidencia: string;
}

export interface Q5Response {
  results: {
    influenciadores_globales: Q5Influencer[];
  };
}

export interface Q6Opportunity {
  oportunidad: string;
  gap_score: number;
  competencia_score: number;
  recomendacion_accion: string;
  detalle: string;
}

export interface Q6Response {
  results: {
    oportunidades: Q6Opportunity[];
  };
}

export interface Q7SentimentAggregated {
  Positivo: number;
  Negativo: number;
  Neutral: number;
  Mixto: number;
  subjetividad_promedio_global: number;
  ejemplo_mixto?: string;
}

export interface Q7Response {
  results: {
    analisis_agregado: Q7SentimentAggregated;
  };
}

export interface Q8WeeklyPoint {
  fecha_semana: string;
  porcentaje_positivo: number;
  engagement: number;
  topico_principal: string;
}

export interface Q8Response {
  results: {
    serie_temporal_semanal: Q8WeeklyPoint[];
    resumen_global: {
      tendencia: string;
    };
  };
}

export interface Q9Recommendation {
  recomendacion: string;
  descripcion: string;
  area_estrategica: string;
  score_impacto: number;
  score_esfuerzo: number;
  prioridad: number;
  urgencia: string;
}

export interface Q9Response {
  results: {
    lista_recomendaciones: Q9Recommendation[];
    resumen_global: {
      recomendaciones_criticas: number;
      areas_prioritarias: string[];
    };
    insight: string;
  };
}

export interface Q10Response {
  results: {
    alerta_prioritaria: string;
    hallazgos_clave: string[];
    resumen_general: string;
    kpis_principales: {
      emocion_dominante: string;
      emocion_porcentaje: number;
      personalidad_marca: string;
      tema_principal: string;
      sentimiento_positivo_pct: number;
      sentimiento_negativo_pct: number;
      tendencia_temporal: string;
      anomalias_detectadas: number;
      recomendaciones_criticas: number;
    };
    urgencias_por_prioridad: {
      "48_horas": string[];
      "semana_1": string[];
      "semanas_2_3": string[];
      "no_urgente": string[];
    };
  };
}

export interface FullAnalysisResponse {
  Q1: Q1Response;
  Q2: Q2Response;
  Q3: Q3Response;
  Q4: Q4Response;
  Q5: Q5Response;
  Q6: Q6Response;
  Q7: Q7Response;
  Q8: Q8Response;
  Q9: Q9Response;
  Q10: Q10Response;
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

/**
 * Get all users (Admin only)
 * GET /users/
 */
export async function getUsers(): Promise<UserInfo[]> {
  const response = await fetch(`${API_BASE_URL}/users/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<UserInfo[]>(response);
}

/**
 * Create a new user (Admin only)
 * POST /users/
 */
export async function createUser(userData: any): Promise<UserInfo> {
  const response = await fetch(`${API_BASE_URL}/users/`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return handleResponse<UserInfo>(response);
}

/**
 * Update a user (Admin only)
 * PATCH /admin-users/{user_id}
 */
export async function updateUser(userId: string, userData: any): Promise<UserInfo> {
  const url = `${API_BASE_URL}/admin-users/${userId}`;
  console.log("updateUser calling:", url);

  // Clean updates - remove id if present
  const updates = { ...userData };
  if ("id" in updates) delete updates["id"];

  const response = await fetch(url, {
    method: 'PATCH',
    body: JSON.stringify(updates),
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<UserInfo>(response);
}

/**
 * Upload User Logo
 * POST /users/upload-logo
 */
export async function uploadUserLogo(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/users/upload-logo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });
  return handleResponse<{ url: string }>(response);
}

/**
 * Delete a user (Admin only)
 * DELETE /users/{user_id}
 */
export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Failed to delete user: ${response.statusText}`);
  }
}

// =============================================================================
// SEMANTIC ORCHESTRATOR ENDPOINTS
// =============================================================================

export interface Client {
  id: string;
  nombre: string;
  industry: string;
  plan: string;
  is_active: boolean;
  created_at: string;
}

export interface ClientStatus {
  hasInterview: boolean;
  hasBrandIdentity: boolean;
  canExecuteAnalysis: boolean;
  lastAnalysisDate?: string;
  analysisStatus?: string;
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
 * Create a new client
 * POST /clients/
 */
export async function createClient(data: { brand_name: string; industry?: string; plan: string }): Promise<Client> {
  const response = await fetch(`${API_BASE_URL}/clients/`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return handleResponse<Client>(response);
}

/**
 * Get client setup status
 * GET /clients/{client_id}/status
 */
export async function getClientStatus(clientId: string): Promise<ClientStatus> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}/status`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse<ClientStatus>(response);
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

/**
 * Get context status for a client
 * GET /semantic/context/{client_id}
 */
export async function getContextStatus(clientId: string): Promise<ContextStatus> {
  const response = await fetch(`${API_BASE_URL}/semantic/context/${clientId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<ContextStatus>(response);
}

/**
 * Upload file for context ingestion (Not supported in v2 yet, using Apify)
 */
export async function ingestFile(
  clientId: string,
  file: File,
  category: string = 'General'
): Promise<{ status: string; context_id: string; cache_active: boolean }> {
  // Placeholder for v2
  return { status: "active", context_id: clientId, cache_active: true };
}

/**
 * Run full Analysis Pipeline (Apify + Gemini)
 * POST /pipeline/start
 */
export async function startPipeline(clientId: string, instagramUrl: string): Promise<{ report_id: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/pipeline/start`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      instagram_url: instagramUrl,
      comments_limit: 1000
    }),
  });
  return handleResponse(response);
}

/**
 * Legacy support for Q1-Q10 analysis endpoint
 */
export async function runFullAnalysis(clientId: string): Promise<FullAnalysisResponse> {
  // This is likely replaced by startPipeline, but keeping for compatibility
  throw new Error("Use startPipeline instead");
}

/**
 * Get latest analysis results
 * GET /semantic/analysis/{client_id}
 */
export async function getLatestAnalysis(clientId: string): Promise<FullAnalysisResponse | null> {
  const response = await fetch(`${API_BASE_URL}/semantic/analysis/${clientId}`, {
    headers: getAuthHeaders(),
  });
  const data = await handleResponse<any>(response);

  // If no analysis found, return null
  if (data.status === 'no_analysis') {
    return null;
  }

  return data as FullAnalysisResponse;
}

/**
 * Send chat message
 * POST /semantic/chat/{client_id}/{session_id}
 */
export async function sendChatMessage(
  clientId: string,
  sessionId: string,
  message: string
): Promise<{ response: string }> {
  const formData = new URLSearchParams();
  formData.append('message', message);

  const response = await fetch(`${API_BASE_URL}/semantic/chat/${clientId}/${sessionId}`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });
  return handleResponse(response);
}

/**
 * Create chat session
 * POST /semantic/chat/{client_id}/session
 */
export async function createChatSession(
  clientId: string,
  title: string = 'Nueva Conversación'
): Promise<{ id: string; title: string }> {
  const response = await fetch(
    `${API_BASE_URL}/semantic/chat/${clientId}/session?title=${encodeURIComponent(title)}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
    }
  );
  return handleResponse(response);
}

/**
 * Get chat sessions for client
 * GET /semantic/chat/{client_id}/sessions
 */
export async function getChatSessions(clientId: string): Promise<Array<{ id: string; title: string; last_message_at: string }>> {
  const response = await fetch(`${API_BASE_URL}/semantic/chat/${clientId}/sessions`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

/**
 * Get chat messages for session
 * GET /semantic/chat/session/{session_id}/messages
 */
export async function getChatMessages(sessionId: string): Promise<Array<{ role: string; content: string; timestamp: string }>> {
  const response = await fetch(`${API_BASE_URL}/semantic/chat/session/${sessionId}/messages`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

// =============================================================================
// CLIENTS (FICHAS) ENDPOINTS
// =============================================================================

export interface FichaCliente {
  id: string;
  nombre_empresa: string;
  tenant_id: string;
  created_at: string;
}

/**
 * Get all fichas for current tenant
 * GET /fichas
 */
export async function getFichas(): Promise<FichaCliente[]> {
  const response = await fetch(`${API_BASE_URL}/fichas`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<FichaCliente[]>(response);
}

export async function getFicha(fichaId: string): Promise<FichaCliente> {
  const response = await fetch(`${API_BASE_URL}/fichas/${fichaId}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<FichaCliente>(response);
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

export async function getInterview(clientId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}/interview`, {
    headers: getAuthHeaders()
  });
  return handleResponse(response);
}

// =============================================================================
// TASKS ENDPOINTS
// =============================================================================

export type TaskStatus = 'PENDIENTE' | 'EN_CURSO' | 'HECHO' | 'REVISADO';

export interface TaskNote {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
}

export interface Task {
  id: string;
  ficha_cliente_id: string;
  title: string;
  description: string | null;
  area_estrategica: string | null;
  urgencia: string | null;
  score_impacto: number | null;
  score_esfuerzo: number | null;
  prioridad: number | null;
  week: number;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  notes: TaskNote[];
}

export interface TasksByWeekResponse {
  week_1: Task[];
  week_2: Task[];
  week_3: Task[];
  week_4: Task[];
  total_tasks: number;
  completed_tasks: number;
}

export interface TaskCreate {
  title: string;
  description?: string;
  area_estrategica?: string;
  urgencia?: string;
  score_impacto?: number;
  score_esfuerzo?: number;
  prioridad?: number;
  week: number;
}

export interface TaskUpdate {
  status: TaskStatus;
}

/**
 * Get all tasks for a ficha grouped by week
 * GET /api/v1/fichas/{ficha_id}/tasks
 */
export async function getTasks(fichaId: string): Promise<TasksByWeekResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/fichas/${fichaId}/tasks`, {
    headers: getAuthHeaders(),
  });
  return handleResponse<TasksByWeekResponse>(response);
}

/**
 * Create a new task
 * POST /api/v1/fichas/{ficha_id}/tasks
 */
export async function createTask(fichaId: string, taskData: TaskCreate): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/v1/fichas/${fichaId}/tasks`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  });
  return handleResponse<Task>(response);
}

/**
 * Update task status
 * PATCH /api/v1/tasks/{task_id}
 */
export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  return handleResponse<Task>(response);
}

/**
 * Delete a task
 * DELETE /api/v1/tasks/{task_id}
 */
export async function deleteTask(taskId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Failed to delete task: ${response.statusText}`);
  }
}

// =============================================================================
// PLANNING (STRATEGY v2) ENDPOINTS
// =============================================================================

export interface Quotas {
  photo: number;
  video: number;
  story: number;
}

export interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  week: number;
  area_estrategica: string;
  format?: 'photo' | 'video' | 'story' | 'reel' | 'post' | string;
  month_group?: string;
  concept_id?: string;
  execution_date: string;
  copy_suggestion?: string;
  score_impacto?: number;
  score_esfuerzo?: number;
  // Phase 1 Enriched Fields
  selected_hook?: string;
  narrative_structure?: string;
  key_elements?: string[];
  dos?: string[];
  donts?: string[];
  strategic_purpose?: string;
}

export async function getPlanningHistory(clientId: string, monthGroup?: string): Promise<{ tasks: GeneratedTask[] }> {
  const url = new URL(`${API_BASE_URL}/planning/${clientId}/history`);
  if (monthGroup) {
    url.searchParams.append('month_group', monthGroup);
  }

  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
}

export async function generateMonthlyPlan(
  clientId: string,
  year: number,
  month: number,
  quotas: Quotas
): Promise<{ status: string, tasks: GeneratedTask[] }> {
  const response = await fetch(`${API_BASE_URL}/planning/generate-month`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      year,
      month,
      quotas
    })
  });
  return handleResponse(response);
}

export async function saveMonthlyPlan(
  clientId: string,
  tasks: GeneratedTask[]
): Promise<{ status: string, count: number }> {
  const response = await fetch(`${API_BASE_URL}/planning/save-month`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      tasks
    })
  });
  return handleResponse(response);
}


/**
 * Add note to a task
 * POST /api/v1/tasks/{task_id}/notes
 */
export async function addTaskNote(taskId: string, content: string): Promise<TaskNote> {
  const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/notes`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });
  return handleResponse<TaskNote>(response);
}

/**
 * Reset user password (Admin only)
 * PUT /users/{user_id}/password
 */
export async function resetPassword(userId: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/password`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorBody.detail || `Failed to reset password: ${response.statusText}`);
  }
}


/**
 * Update user plan (Admin only)
 * PUT /users/{user_id}/plan
 */
export async function updateUserPlan(
  userId: string,
  plan: string,
  planExpiresAt?: string | null,
  benefits: string[] = []
): Promise<{ plan: string; plan_expires_at: string | null; benefits: string[] }> {
  const response = await fetch(`${API_BASE_URL}/users/${userId}/plan`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan,
      plan_expires_at: planExpiresAt || null,
      benefits
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorBody.detail || `Failed to update plan: ${response.statusText}`);
  }

  return response.json();
}


/**
 * Generate Personas using AI
 * POST /clients/{client_id}/personas
 */
export async function generatePersonas(clientId: string, data: any): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/clients/${clientId}/personas`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
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

export async function generateManual(clientId: string): Promise<{ status: string; message: string; data: any }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/brands/${clientId}/manual`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Error generating manual');
  }

  return response.json();
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

