"use client";

import { useQuery } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import { type Filters, toQueryParams } from "@/lib/filters";

/** A single product's variants (drill-down). Only fetches when a code is selected. */
export function useProductDetail(filters: Filters, productCode: string | null) {
  const query = toQueryParams(filters);
  return useQuery({
    queryKey: ["product-detail", productCode, query],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/products/{product_code}", {
          params: { path: { product_code: productCode as string }, query },
        }),
      ),
    enabled: productCode !== null,
  });
}
