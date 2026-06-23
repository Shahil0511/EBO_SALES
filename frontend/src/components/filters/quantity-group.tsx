"use client";

import { FilterGroup } from "@/components/filters/filter-group";

type Qty = { qtyMin: number | null; qtyMax: number | null };

const inputClass =
  "border-border bg-background h-8 w-full rounded-md border px-2 text-xs focus:outline-none";
const chipClass = "border-border hover:bg-muted rounded-full border px-2.5 py-1 text-xs";

export function QuantityGroup({
  qtyMin,
  qtyMax,
  onChange,
}: {
  qtyMin: number | null;
  qtyMax: number | null;
  onChange: (qty: Qty) => void;
}) {
  const active = qtyMin !== null || qtyMax !== null;
  const toNum = (v: string): number | null => (v === "" ? null : Number(v));

  return (
    <FilterGroup title="Quantity" badge={active ? 1 : 0}>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={qtyMin ?? ""}
          onChange={(e) => onChange({ qtyMin: toNum(e.target.value), qtyMax })}
          placeholder="Min"
          className={inputClass}
        />
        <span className="text-muted-foreground">–</span>
        <input
          type="number"
          value={qtyMax ?? ""}
          onChange={(e) => onChange({ qtyMin, qtyMax: toNum(e.target.value) })}
          placeholder="Max"
          className={inputClass}
        />
      </div>
      <div className="mt-2 flex gap-1">
        <button type="button" className={chipClass} onClick={() => onChange({ qtyMin: null, qtyMax: null })}>
          All
        </button>
        <button type="button" className={chipClass} onClick={() => onChange({ qtyMin: 1, qtyMax: null })}>
          Sales ≥1
        </button>
        <button type="button" className={chipClass} onClick={() => onChange({ qtyMin: null, qtyMax: -1 })}>
          Returns &lt;0
        </button>
      </div>
    </FilterGroup>
  );
}
