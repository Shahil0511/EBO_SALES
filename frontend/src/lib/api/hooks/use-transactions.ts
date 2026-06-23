"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import { type Filters, toQueryParams } from "@/lib/filters";

export type TransactionSortKey =
  | "date"
  | "invoice"
  | "product"
  | "sku"
  | "store"
  | "category"
  | "brand"
  | "qty"
  | "mrp"
  | "discount"
  | "net"
  | "salesperson";

export type SortDir = "asc" | "desc";

/** One filtered, sorted, paginated page of the transactions table. */
export function useTransactions(
  filters: Filters,
  opts: { page: number; pageSize: number; sortKey: TransactionSortKey; sortDir: SortDir },
) {
  const query = {
    ...toQueryParams(filters),
    page: opts.page,
    pageSize: opts.pageSize,
    sortKey: opts.sortKey,
    sortDir: opts.sortDir,
  };
  return useQuery({
    queryKey: ["transactions", query],
    queryFn: () => unwrap(api.GET("/api/v1/transactions", { params: { query } })),
    placeholderData: keepPreviousData,
  });
}
