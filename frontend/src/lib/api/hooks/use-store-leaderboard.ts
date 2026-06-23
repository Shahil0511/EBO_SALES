"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";

/** Current-month store leaderboard (MTD KPIs + projection + WoW). Reads a fast matview roll-up. */
export function useStoreLeaderboard() {
  return useQuery({
    queryKey: ["store-leaderboard"],
    queryFn: () => unwrap(api.GET("/api/v1/stores/leaderboard")),
    staleTime: 5 * 60_000, // the matview refreshes ~daily; no need to refetch often
  });
}
