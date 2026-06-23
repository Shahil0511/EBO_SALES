"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";

export type HierarchyLevel = "region" | "cluster" | "area_manager" | "regional_manager";

/** Current-month totals grouped by one hierarchy level (region / cluster / a manager). */
export function useStoreHierarchy(level: HierarchyLevel) {
  return useQuery({
    queryKey: ["store-hierarchy", level],
    queryFn: () => unwrap(api.GET("/api/v1/stores/hierarchy/{level}", { params: { path: { level } } })),
    staleTime: 5 * 60_000,
  });
}
