"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import type { Filters } from "@/lib/filters";

/** One salesperson's detail (KPIs + daily trend + stores + top products) over the date window. */
export function useSalespersonDetail(code: string, filters: Filters) {
  return useQuery({
    queryKey: ["salesperson-detail", code, filters.dateFrom, filters.dateTo],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/stores/salesperson/{code}", {
          params: {
            path: { code },
            query: { dateFrom: filters.dateFrom, dateTo: filters.dateTo },
          },
        }),
      ),
    enabled: code.length > 0,
  });
}
