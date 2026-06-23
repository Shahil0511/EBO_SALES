import { Suspense } from "react";

import { FilterRail } from "@/components/filters/filter-rail";
import { MobileFilters } from "@/components/filters/mobile-filters";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * The persistent app shell — header (nav + search + export) and the sidebar filter rail —
 * wrapping EVERY route via the root layout. Each page renders only its content into `main`,
 * so the dashboard and the detail pages (metric / product / invoice) share one chrome and
 * one set of filters. Because it lives in the layout, the shell does not remount on navigation.
 *
 * A server component: it renders the server `SiteHeader` plus the client rail/main. The rail
 * and page content read filters via useSearchParams, so they sit under one Suspense boundary.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <SiteHeader />
      <Suspense fallback={<div className="flex-1" />}>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <FilterRail />
          <MobileFilters />
          <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        </div>
      </Suspense>
    </div>
  );
}
