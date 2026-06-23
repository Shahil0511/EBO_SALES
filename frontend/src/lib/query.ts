import { QueryClient } from "@tanstack/react-query";

/**
 * Factory for the TanStack Query client. A factory (not a singleton) so each browser
 * session — and each test — gets a fresh client; `providers.tsx` keeps one stable
 * instance per app via `useState`.
 *
 * Defaults tuned for an analytics dashboard: data is fresh for 60s (the warehouse
 * doesn't change second-to-second), no refetch on window focus, one retry.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
