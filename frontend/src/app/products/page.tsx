import { Suspense } from "react";

import { ProductRoute } from "@/components/products/product-route";

/** Product analysis route: /products?code=<productCode>&<filters>. */
export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-6 text-sm">Loading…</div>}>
      <ProductRoute />
    </Suspense>
  );
}
