"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { ProductPage } from "@/components/products/product-page";

/** Reads the `?code=<productCode>` query param and renders its analysis page. */
export function ProductRoute() {
  const code = useSearchParams().get("code");

  if (!code) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-8 text-center">
        <div>
          <h1 className="font-heading text-lg font-semibold">No product selected</h1>
          <Link
            href="/"
            className="bg-primary text-primary-foreground mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <ProductPage code={code} />;
}
