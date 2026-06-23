import { Suspense } from "react";

import { StoreRoute } from "@/components/stores/store-route";

/** Store performance: /stores (leaderboard) and /stores?code=<store_code> (detail). */
export default function StoresPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-6 text-sm">Loading…</div>}>
      <StoreRoute />
    </Suspense>
  );
}
