import { Suspense } from "react";

import { FilterRail } from "@/components/filters/filter-rail";
import { SiteHeader } from "@/components/layout/site-header";

// F2 dashboard shell: header + filter rail + the content grid. Each section is a
// placeholder card that the real components replace in F7–F10.
const SECTIONS = [
  { title: "KPIs", milestone: "F7", span: "lg:col-span-12", height: "h-28" },
  { title: "Revenue trend", milestone: "F8", span: "lg:col-span-8", height: "h-64" },
  { title: "Category · Brand · Channel", milestone: "F8", span: "lg:col-span-4", height: "h-64" },
  { title: "Product gallery", milestone: "F9", span: "lg:col-span-12", height: "h-72" },
  { title: "Transactions", milestone: "F10", span: "lg:col-span-12", height: "h-80" },
];

export default function DashboardPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <div className="flex flex-1">
        <Suspense
          fallback={
            <div className="border-border bg-sidebar hidden w-72 shrink-0 border-r lg:block" />
          }
        >
          <FilterRail />
        </Suspense>
        <main className="flex-1 space-y-5 p-4 lg:p-6">
          <p className="text-muted-foreground text-sm">No filters · showing all line items</p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {SECTIONS.map((section) => (
              <section
                key={section.title}
                className={`border-border bg-card flex flex-col rounded-xl border p-4 ${section.span} ${section.height}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-heading text-sm font-semibold">{section.title}</h3>
                  <span className="text-muted-foreground font-mono text-[11px]">
                    {section.milestone}
                  </span>
                </div>
                <div className="border-border text-muted-foreground mt-3 flex flex-1 items-center justify-center rounded-lg border border-dashed text-xs">
                  wired in {section.milestone}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
