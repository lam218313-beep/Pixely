/**
 * Pixely Partners - Tasks Hook
 * 
 * Shared state for tasks across RightSidebar and TasksView
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// =============================================================================
// TYPES
// =============================================================================

export interface TasksState {
  tasks: api.Task[];
  isLoading: boolean;
  error: string | null;
  stats: {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
  };
}

interface UseTasksReturn extends TasksState {
  refreshTasks: () => Promise<void>;
  updateTaskStatus: (taskId: string, status: api.TaskStatus) => Promise<void>;
  getTasksByStatus: (status: api.TaskStatus) => api.Task[];
  getPendingTasks: (limit?: number) => api.Task[];
}

// =============================================================================
// CONTEXT
// =============================================================================

const TasksContext = createContext<UseTasksReturn | undefined>(undefined);

// =============================================================================
// HOOK
// =============================================================================

function useTasks(): UseTasksReturn {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<api.Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = user?.fichaClienteId;

  // Fetch all tasks
  const refreshTasks = useCallback(async () => {
    if (!clientId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getTasks(clientId);
      // Flatten all weeks into a single array
      const allTasks = [
        ...response.week_1,
        ...response.week_2,
        ...response.week_3,
        ...response.week_4,
      ];
      setTasks(allTasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar tareas');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  // Update task status
  const updateTaskStatus = useCallback(async (taskId: string, status: api.TaskStatus) => {
    try {
      const updatedTask = await api.updateTaskStatus(taskId, status);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    } catch (err) {
      console.error('Failed to update task:', err);
      throw err;
    }
  }, []);

  // Get tasks by status
  const getTasksByStatus = useCallback((status: api.TaskStatus) => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  // Get pending tasks (for sidebar)
  const getPendingTasks = useCallback((limit: number = 5) => {
    return tasks
      .filter(t => t.status === 'PENDIENTE' || t.status === 'EN_CURSO')
      .sort((a, b) => {
        // Sort by priority (higher first) then by updated_at
        if (a.prioridad !== b.prioridad) {
          return (b.prioridad || 0) - (a.prioridad || 0);
        }
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(0, limit);
  }, [tasks]);

  // Calculate stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'HECHO' || t.status === 'REVISADO').length,
    pending: tasks.filter(t => t.status === 'PENDIENTE').length,
    inProgress: tasks.filter(t => t.status === 'EN_CURSO').length,
  };

  // Load tasks on mount
  useEffect(() => {
    if (clientId) {
      refreshTasks();
    }
  }, [clientId, refreshTasks]);

  return {
    tasks,
    isLoading,
    error,
    stats,
    refreshTasks,
    updateTaskStatus,
    getTasksByStatus,
    getPendingTasks,
  };
}

// =============================================================================
// PROVIDER
// =============================================================================

interface TasksProviderProps {
  children: ReactNode;
}

export function TasksProvider({ children }: TasksProviderProps) {
  const tasksState = useTasks();

  return (
    <TasksContext.Provider value={tasksState}>
      {children}
    </TasksContext.Provider>
  );
}

// =============================================================================
// CONSUMER HOOK
// =============================================================================

export function useTasksContext(): UseTasksReturn {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasksContext must be used within a TasksProvider');
  }
  return context;
}
