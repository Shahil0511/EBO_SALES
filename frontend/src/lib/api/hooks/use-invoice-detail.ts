"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";

/** A full invoice (bill): header + line items, scoped to a date window for chunk pruning.
 * `store` (associate name) disambiguates reused POS invoice numbers across stores/days. */
export function useInvoiceDetail(invoiceNo: string, dateFrom: string, dateTo: string, store?: string) {
  return useQuery({
    queryKey: ["invoice", invoiceNo, dateFrom, dateTo, store ?? null],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/transactions/invoice/{invoice_no}", {
          params: { path: { invoice_no: invoiceNo }, query: { dateFrom, dateTo, store } },
        }),
      ),
    enabled: invoiceNo.length > 0,
  });
}
