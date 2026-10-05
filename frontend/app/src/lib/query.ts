import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * The app's short-term memory: what a screen already loaded shows instantly when you
 * come back, and refreshes quietly in the background. Mobile data in Peru is slow,
 * so a screen never starts empty if we already had its data.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
    mutations: { retry: 0 },
  },
});
