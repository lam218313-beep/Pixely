/**
 * Pixely Partners - Analysis Data Hook
 * 
 * Custom hook for fetching and managing Q1-Q10 analysis data
 */

import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// =============================================================================
// TYPES
// =============================================================================

export interface AnalysisData {
  Q1: api.Q1Response | null;
  Q2: api.Q2Response | null;
  Q3: api.Q3Response | null;
  Q4: api.Q4Response | null;
  Q5: api.Q5Response | null;
  Q6: api.Q6Response | null;
  Q7: api.Q7Response | null;
  Q8: api.Q8Response | null;
  Q9: api.Q9Response | null;
  Q10: api.Q10Response | null;
}

interface UseAnalysisReturn {
  data: AnalysisData;
  isLoading: boolean;
  error: string | null;
  runAnalysis: () => Promise<void>;
  contextStatus: api.ContextStatus | null;
  refreshContextStatus: () => Promise<void>;
}

// =============================================================================
// DEFAULT DATA (for initial/empty state)
// =============================================================================

const DEFAULT_Q1: api.Q1Response = {
  emociones: [
    { name: 'Alegría', value: 0 },
    { name: 'Confianza', value: 0 },
    { name: 'Miedo', value: 0 },
    { name: 'Sorpresa', value: 0 },
    { name: 'Tristeza', value: 0 },
    { name: 'Aversión', value: 0 },
    { name: 'Ira', value: 0 },
    { name: 'Anticipación', value: 0 },
  ],
};

const DEFAULT_Q2: api.Q2Response = {
  resumen_global_personalidad: {
    Sinceridad: 0,
    Emocion: 0,
    Competencia: 0,
    Sofisticacion: 0,
    Rudeza: 0,
  },
};

const DEFAULT_Q3: api.Q3Response = {
  results: {
    analisis_agregado: [],
  },
};

const DEFAULT_Q4: api.Q4Response = {
  results: {
    analisis_agregado: { Positivo: 0, Negativo: 0, Aspiracional: 0 },
    evolucion_temporal: [],
  },
};

const DEFAULT_Q5: api.Q5Response = {
  results: {
    influenciadores_globales: [],
  },
};

const DEFAULT_Q6: api.Q6Response = {
  results: {
    oportunidades: [],
  },
};

const DEFAULT_Q7: api.Q7Response = {
  results: {
    analisis_agregado: {
      Positivo: 0,
      Negativo: 0,
      Neutral: 0,
      Mixto: 0,
      subjetividad_promedio_global: 0,
    },
  },
};

const DEFAULT_Q8: api.Q8Response = {
  results: {
    serie_temporal_semanal: [],
    resumen_global: { tendencia: 'Sin datos' },
  },
};

const DEFAULT_Q9: api.Q9Response = {
  results: {
    lista_recomendaciones: [],
    resumen_global: {
      recomendaciones_criticas: 0,
      areas_prioritarias: [],
    },
    insight: '',
  },
};

const DEFAULT_Q10: api.Q10Response = {
  results: {
    alerta_prioritaria: '',
    hallazgos_clave: [],
    resumen_general: '',
    kpis_principales: {
      emocion_dominante: '',
      emocion_porcentaje: 0,
      personalidad_marca: '',
      tema_principal: '',
      sentimiento_positivo_pct: 0,
      sentimiento_negativo_pct: 0,
      tendencia_temporal: '',
      anomalias_detectadas: 0,
      recomendaciones_criticas: 0,
    },
    urgencias_por_prioridad: {
      "48_horas": [],
      "semana_1": [],
      "semanas_2_3": [],
      "no_urgente": [],
    },
  },
};

const DEFAULT_DATA: AnalysisData = {
  Q1: DEFAULT_Q1,
  Q2: DEFAULT_Q2,
  Q3: DEFAULT_Q3,
  Q4: DEFAULT_Q4,
  Q5: DEFAULT_Q5,
  Q6: DEFAULT_Q6,
  Q7: DEFAULT_Q7,
  Q8: DEFAULT_Q8,
  Q9: DEFAULT_Q9,
  Q10: DEFAULT_Q10,
};

// =============================================================================
// HOOK
// =============================================================================

export function useAnalysis(): UseAnalysisReturn {
  const { user } = useAuth();
  const [data, setData] = useState<AnalysisData>(DEFAULT_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextStatus, setContextStatus] = useState<api.ContextStatus | null>(null);

  const clientId = user?.fichaClienteId;

  // Refresh context status
  const refreshContextStatus = useCallback(async () => {
    if (!clientId) return;

    try {
      const status = await api.getContextStatus(clientId);
      setContextStatus(status);
    } catch (err) {
      console.error('Failed to get context status:', err);
    }
  }, [clientId]);

  // Load existing analysis data
  const loadExistingAnalysis = useCallback(async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const response = await api.getLatestAnalysis(clientId);
      if (response) {
        setData({
          Q1: response.Q1 || DEFAULT_Q1,
          Q2: response.Q2 || DEFAULT_Q2,
          Q3: response.Q3 || DEFAULT_Q3,
          Q4: response.Q4 || DEFAULT_Q4,
          Q5: response.Q5 || DEFAULT_Q5,
          Q6: response.Q6 || DEFAULT_Q6,
          Q7: response.Q7 || DEFAULT_Q7,
          Q8: response.Q8 || DEFAULT_Q8,
          Q9: response.Q9 || DEFAULT_Q9,
          Q10: response.Q10 || DEFAULT_Q10,
        });
      }
    } catch (err) {
      console.error('Failed to load existing analysis:', err);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // Run full analysis
  const runAnalysis = useCallback(async () => {
    if (!clientId) {
      setError('No client selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.runFullAnalysis(clientId);

      // After running, load the formatted data from the get endpoint
      await loadExistingAnalysis();
    } catch (err) {
      const message = err instanceof api.ApiError
        ? err.message
        : 'Error al ejecutar análisis';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, loadExistingAnalysis]);

  // Load context status and existing analysis on mount and when client changes
  useEffect(() => {
    if (clientId) {
      refreshContextStatus();
      loadExistingAnalysis();
    }
  }, [clientId, refreshContextStatus, loadExistingAnalysis]);

  return {
    data,
    isLoading,
    error,
    runAnalysis,
    contextStatus,
    refreshContextStatus,
  };
}

// =============================================================================
// PROVIDER (optional, for sharing analysis state across components)
// =============================================================================

import React, { createContext, useContext, ReactNode } from 'react';

const AnalysisContext = createContext<UseAnalysisReturn | undefined>(undefined);

interface AnalysisProviderProps {
  children: ReactNode;
}

export function AnalysisProvider({ children }: AnalysisProviderProps) {
  const analysis = useAnalysis();

  return (
    <AnalysisContext.Provider value={analysis}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisContext(): UseAnalysisReturn {
  const context = useContext(AnalysisContext);
  if (context === undefined) {
    throw new Error('useAnalysisContext must be used within an AnalysisProvider');
  }
  return context;
}
