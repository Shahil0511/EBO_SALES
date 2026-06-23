"use client";

import { useSearchParams } from "next/navigation";

import { StoreDetail } from "@/components/stores/store-detail";
import { StoreHierarchy } from "@/components/stores/store-hierarchy";
import { StoreLeaderboard } from "@/components/stores/store-leaderboard";

/** `/stores?code=<store_code>` → store detail; `/stores` → the leaderboard. */
export function StoreRoute() {
  const code = useSearchParams().get("code");

  if (code) return <StoreDetail storeCode={code} />;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="font-heading text-lg font-semibold">Store performance</h1>
        <p className="text-muted-foreground text-sm">
          This month, every store — ranked by net sale. Sort any column; click a store for detail.
        </p>
      </div>
      <StoreLeaderboard />
      <StoreHierarchy />
    </div>
  );
}
