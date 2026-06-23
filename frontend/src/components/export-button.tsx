"use client";

import { Download } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { serializeFilters } from "@/lib/filters";
import { useFilters } from "@/lib/use-filters";

/**
 * Export the currently-filtered transactions as CSV. It's a plain download link: the
 * href carries the same filter query string, so the streaming `/export/transactions.csv`
 * endpoint returns exactly the rows in view (the browser downloads via the proxy).
 */
export function ExportButton() {
  const { filters } = useFilters();
  const href = `/api/v1/export/transactions.csv?${serializeFilters(filters).toString()}`;

  return (
    <a className={buttonVariants({ variant: "outline", size: "sm" })} href={href} download>
      <Download className="size-4" /> Export
    </a>
  );
}
