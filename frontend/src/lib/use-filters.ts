"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { FILTER_PARAM_KEYS, type Filters, parseFilters, serializeFilters } from "@/lib/filters";

const OWNED = new Set<string>(FILTER_PARAM_KEYS);

/**
 * Read + update the dashboard filters, with the URL as the source of truth.
 *
 * - `filters`: parsed from the current query string (memoized).
 * - `setFilters(patch)`: merges a partial change and writes it back via `router.replace`
 *   (no history spam, no scroll jump). **Route-identity params the filters don't own —
 *   `?m=` / `?code=` / `?no=` / `?from=` / `?to=` — are preserved**, so adjusting the
 *   sidebar on a detail page keeps you on that page.
 * - `resetFilters()`: clears the filter params back to defaults, again keeping identity params.
 *
 * Consumers must sit under a `<Suspense>` boundary (provided by the app shell).
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
      const next = serializeFilters({ ...filters, ...patch });
      // Carry over any non-filter params (route identity) the serializer doesn't emit.
      new URLSearchParams(searchParams.toString()).forEach((value, key) => {
        if (!OWNED.has(key) && !next.has(key)) next.append(key, value);
      });
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [filters, pathname, router, searchParams],
  );

  const resetFilters = useCallback(() => {
    const kept = new URLSearchParams();
    new URLSearchParams(searchParams.toString()).forEach((value, key) => {
      if (!OWNED.has(key)) kept.append(key, value);
    });
    const qs = kept.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return { filters, setFilters, resetFilters };
}
