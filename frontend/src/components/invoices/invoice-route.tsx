"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { InvoiceDetail } from "@/components/invoices/invoice-detail";
import { useFilters } from "@/lib/use-filters";

/**
 * Reads `?no=<invoice>&from=<date>&to=<date>`. `from`/`to` narrow the chunk scan (a row
 * passes its exact date); when absent they fall back to the dashboard's filter window.
 */
export function InvoiceRoute() {
  const { filters } = useFilters();
  const sp = useSearchParams();
  const no = sp.get("no");
  const from = sp.get("from") || filters.dateFrom;
  const to = sp.get("to") || filters.dateTo;

  if (!no) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-8 text-center">
        <div>
          <h1 className="font-heading text-lg font-semibold">No invoice selected</h1>
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

  return <InvoiceDetail invoiceNo={no} dateFrom={from} dateTo={to} />;
}
