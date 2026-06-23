import { Suspense } from "react";

import { InvoiceRoute } from "@/components/invoices/invoice-route";

/** Invoice (bill) detail route: /invoices?no=<invoice>&from=<date>&to=<date>&<filters>. */
export default function InvoicePage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-6 text-sm">Loading…</div>}>
      <InvoiceRoute />
    </Suspense>
  );
}
