"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { type Filters, parseFilters, serializeFilters } from "@/lib/filters";

/**
 * Read + update the dashboard filters, with the URL as the source of truth.
 *
 * - `filters`: parsed from the current query string (memoized).
 * - `setFilters(patch)`: merges a partial change and writes it back to the URL via
 *   `router.replace` (no history spam, no scroll jump). Every data hook reads `filters`,
 *   so one call refetches everything.
 * - `resetFilters()`: clears the query string back to defaults.
 *
 * Uses the client-side `useSearchParams` hook (not the async `searchParams` page prop),
 * which is the clean way to read params reactively in Next 16. Consumers must sit under a
 * `<Suspense>` boundary (added in F5).
 */
export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilters = useCallback(
    (patch: Partial<Filters>) => {
      const query = serializeFilters({ ...filters, ...patch }).toString();
      router.replace(`${pathname}?${query}`, { scroll: false });
    },
    [filters, pathname, router],
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, setFilters, resetFilters };
}
