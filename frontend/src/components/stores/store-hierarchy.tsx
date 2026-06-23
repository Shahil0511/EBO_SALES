"use client";

import { useState } from "react";

import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { type HierarchyLevel, useStoreHierarchy } from "@/lib/api/hooks/use-store-hierarchy";
import { inr, num } from "@/lib/format";

const LEVELS: { key: HierarchyLevel; label: string }[] = [
  { key: "region", label: "Region" },
  { key: "cluster", label: "Cluster" },
  { key: "area_manager", label: "Area mgr" },
  { key: "regional_manager", label: "Regional mgr" },
];

export function StoreHierarchy() {
  const [level, setLevel] = useState<HierarchyLevel>("region");
  const { data, isLoading, isError } = useStoreHierarchy(level);

  const items = data?.items ?? [];
  const max = Math.max(1, ...items.map((i) => i.nsv));

  return (
    <section className="border-border bg-card shadow-card rounded-xl border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold">Rollups</h3>
        <Segmented value={level} onChange={setLevel} options={LEVELS} layoutId="storeHierarchy" ariaLabel="Group by" />
      </div>

      {isError ? (
        <p className="text-destructive text-xs">Failed to load.</p>
      ) : isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-xs">No data.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((g) => (
            <li key={g.label || "unassigned"}>
              <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium">{g.label || "Unassigned"}</span>
                <span className="text-muted-foreground shrink-0 font-mono">
                  {inr(g.nsv)}{" "}
                  <span className="text-muted-foreground/70">
                    · {g.storeCount} stores · {num(g.billCnt)} bills · ATV {inr(g.atv)}
                  </span>
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div className="bg-primary h-full rounded-full" style={{ width: `${(g.nsv / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
