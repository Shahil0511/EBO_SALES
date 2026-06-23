import { Download, Search } from "lucide-react";

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
          <div className="font-heading text-base font-semibold">Libas</div>
          <div className="text-muted-foreground text-[11px] tracking-wider uppercase">
            Sales Intelligence
          </div>
        </div>
      </div>

      <div className="relative mx-auto hidden w-full max-w-md items-center md:flex">
        <Search className="text-muted-foreground pointer-events-none absolute left-3 size-4" />
        <input
          disabled
          placeholder="Search product code, SKU or invoice…"
          className="border-border bg-card text-foreground placeholder:text-muted-foreground/70 h-9 w-full rounded-full border pr-3 pl-9 text-sm focus:outline-none disabled:opacity-70"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="border-border bg-card text-muted-foreground hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:flex">
          <span className="bg-chart-3 size-1.5 rounded-full" /> Loading…
        </span>
        <Button variant="outline" size="sm" disabled>
          <Download className="size-4" /> Export
        </Button>
      </div>
    </header>
  );
}
