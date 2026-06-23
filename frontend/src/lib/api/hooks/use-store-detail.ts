"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import type { Filters } from "@/lib/filters";

/** One store's detail (KPIs + daily series + salesperson leaderboard) over the date window. */
export function useStoreDetail(storeCode: string, filters: Filters) {
  return useQuery({
    queryKey: ["store-detail", storeCode, filters.dateFrom, filters.dateTo],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/stores/{store_code}", {
          params: {
            path: { store_code: storeCode },
            query: { dateFrom: filters.dateFrom, dateTo: filters.dateTo },
          },
        }),
      ),
    enabled: storeCode.length > 0,
  });
}
