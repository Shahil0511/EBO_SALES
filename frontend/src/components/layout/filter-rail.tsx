/**
 * Left filter rail. Static frame in F2 — the real controls (date range, multi-selects,
 * quantity, cascading staff filter) land in F5, driven by URL state from F4.
 */
const FILTER_GROUPS = [
  "Date range",
  "Stores",
  "Brand",
  "Category",
  "Business channel",
  "Quantity",
  "Sales staff",
];

export function FilterRail() {
  return (
    <aside className="border-border bg-sidebar hidden w-72 shrink-0 border-r lg:block">
      <div className="flex h-12 items-center justify-between px-4">
        <h2 className="font-heading text-sm font-semibold">Filters</h2>
        <button className="text-muted-foreground text-xs disabled:opacity-60" disabled>
          Reset all
        </button>
      </div>
      <div className="space-y-2 px-3 pb-6">
        {FILTER_GROUPS.map((group) => (
          <div
            key={group}
            className="border-border bg-card flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm"
          >
            <span>{group}</span>
            <span className="bg-accent text-accent-foreground rounded-full px-2 py-0.5 text-[11px]">
              All
            </span>
          </div>
        ))}
        <p className="text-muted-foreground px-1 pt-2 text-xs">Controls arrive in F5.</p>
      </div>
    </aside>
  );
}
