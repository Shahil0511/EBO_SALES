import { Download } from "lucide-react";
import { Suspense } from "react";

import { ExportButton } from "@/components/export-button";
import { GlobalSearch } from "@/components/search/global-search";
import { Button } from "@/components/ui/button";

/**
 * Top bar: brand, a (placeholder) global-search slot, a data-freshness badge, and the
 * export action. Static in F2 — search is wired in F10, export in F11.
 */
export function SiteHeader() {
  return (
    <header className="border-border bg-background/85 sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4 backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <div className="bg-primary text-primary-foreground font-heading grid size-8 place-items-center rounded-md text-lg font-semibold">
          L
        </div>
        <div className="leading-tight">
          <h1 className="font-heading text-base font-semibold">Libas</h1>
          <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
            Sales Intelligence
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="mx-auto hidden h-9 w-full max-w-md md:block" />}>
        <GlobalSearch />
      </Suspense>

      <div className="ml-auto flex items-center gap-3">
        <Suspense
          fallback={
            <Button variant="outline" size="sm" disabled>
              <Download className="size-4" /> Export
            </Button>
          }
        >
          <ExportButton />
        </Suspense>
      </div>
    </header>
  );
}
