"use client";

import { FilterRailContent } from "@/components/filters/filter-rail-content";

/** Desktop sidebar (hidden on mobile — the mobile drawer takes over there). */
export function FilterRail() {
  return (
    <aside className="border-border bg-sidebar hidden w-72 shrink-0 overflow-y-auto border-r lg:block">
      <FilterRailContent />
    </aside>
  );
}
