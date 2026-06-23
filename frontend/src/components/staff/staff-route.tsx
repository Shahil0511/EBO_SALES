"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { SalespersonDetail } from "@/components/staff/salesperson-detail";

/** `/staff?code=<sales_person_code>` → salesperson detail; otherwise a pointer to stores. */
export function StaffRoute() {
  const code = useSearchParams().get("code");

  if (code) return <SalespersonDetail code={code} />;

  return (
    <div className="grid min-h-[60vh] place-items-center p-8 text-center">
      <div>
        <h1 className="font-heading text-lg font-semibold">No salesperson selected</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Open a store and pick a rep from its Sales staff list.
        </p>
        <Link
          href="/stores"
          className="bg-primary text-primary-foreground mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium"
        >
          Browse stores
        </Link>
      </div>
    </div>
  );
}
