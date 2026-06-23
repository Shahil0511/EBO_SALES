import { Suspense } from "react";

import { StaffRoute } from "@/components/staff/staff-route";

/** Salesperson detail: /staff?code=<sales_person_code>. */
export default function StaffPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-6 text-sm">Loading…</div>}>
      <StaffRoute />
    </Suspense>
  );
}
