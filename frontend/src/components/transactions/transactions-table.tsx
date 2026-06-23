"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import {
  type SortDir,
  type TransactionSortKey,
  useTransactions,
} from "@/lib/api/hooks/use-transactions";
import { inr, num } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string): string {
  const [date] = iso.split("T");
  const [, m, d] = date.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
}

type TxnRow = {
  invoiceDate: string;
  invoiceNo: string | null;
  productCode: string | null;
  sku: string | null;
  store: string | null;
  channel: string | null;
  category: string | null;
  qty: number;
  mrp: number;
  net: number;
  salesperson: string | null;
  customer: string | null;
};

type Column = {
  label: string;
  sortKey?: TransactionSortKey;
  align?: "right";
  cell: (r: TxnRow) => React.ReactNode;
};

const COLUMNS: Column[] = [
  { label: "Date", sortKey: "date", cell: (r) => fmtDate(r.invoiceDate) },
  { label: "Invoice", sortKey: "invoice", cell: (r) => <span className="font-mono">{r.invoiceNo}</span> },
  { label: "Product", sortKey: "product", cell: (r) => <span className="font-mono">{r.productCode}</span> },
  { label: "SKU", sortKey: "sku", cell: (r) => <span className="font-mono">{r.sku}</span> },
  { label: "Store", sortKey: "store", cell: (r) => r.store },
  {
    label: "Ch",
    cell: (r) => (
      <span className="bg-muted rounded px-1.5 py-0.5 text-[10px] font-medium">{r.channel}</span>
    ),
  },
  { label: "Category", sortKey: "category", cell: (r) => r.category },
  {
    label: "Qty",
    sortKey: "qty",
    align: "right",
    cell: (r) => <span className={cn(r.qty < 0 && "text-destructive")}>{r.qty}</span>,
  },
  { label: "MRP", sortKey: "mrp", align: "right", cell: (r) => inr(r.mrp) },
  {
    label: "Net",
    sortKey: "net",
    align: "right",
    cell: (r) => <span className={cn(r.net < 0 && "text-destructive")}>{inr(r.net)}</span>,
  },
  { label: "Staff", sortKey: "salesperson", cell: (r) => r.salesperson },
  { label: "Customer", cell: (r) => r.customer },
];

const NUMERIC: TransactionSortKey[] = ["date", "qty", "mrp", "discount", "net"];
const PAGE_SIZES = [25, 50, 100];

export function TransactionsTable({ className }: { className?: string }) {
  const { filters } = useFilters();
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<TransactionSortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Reset to page 1 when sort or filters change (adjust-state-during-render).
  const resetKey = `${sortKey}|${sortDir}|${pageSize}|${JSON.stringify(filters)}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setPage(1);
  }

  const { data, isLoading, isError, isPlaceholderData } = useTransactions(filters, {
    page,
    pageSize,
    sortKey,
    sortDir,
  });
  const rows = (data?.items ?? []) as TxnRow[];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 0;

  const onSort = (key: TransactionSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(NUMERIC.includes(key) ? "desc" : "asc");
    }
  };

  return (
    <section className={cn("border-border bg-card shadow-card flex flex-col rounded-xl border p-4", className)}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold">Transactions</h3>
        <p className="text-muted-foreground text-xs">
          <span className="text-foreground font-medium">{num(total)}</span> line items ·{" "}
          {data && <span className="text-foreground font-medium">{inr(data.items.reduce((s, r) => s + r.net, 0))}</span>}{" "}
          this page
        </p>
      </div>

      {isError ? (
        <p className="text-destructive text-sm">Failed to load transactions.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-left">
                {COLUMNS.map((c) => (
                  <th
                    key={c.label}
                    scope="col"
                    aria-sort={
                      c.sortKey && sortKey === c.sortKey
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={cn("px-2 py-2 font-medium whitespace-nowrap", c.align === "right" && "text-right")}
                  >
                    {c.sortKey ? (
                      <button
                        type="button"
                        onClick={() => onSort(c.sortKey as TransactionSortKey)}
                        className="hover:text-foreground inline-flex items-center gap-0.5"
                      >
                        {c.label}
                        {sortKey === c.sortKey && <span>{sortDir === "asc" ? "▴" : "▾"}</span>}
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn(isPlaceholderData && "opacity-60")}>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-border/60 border-b">
                    {COLUMNS.map((c) => (
                      <td key={c.label} className="px-2 py-2">
                        <div className="bg-muted h-3 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-muted-foreground py-8 text-center">
                    No transactions in this view.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.invoiceNo}-${r.sku}-${i}`} className="border-border/60 hover:bg-muted/50 border-b transition-colors">
                    {COLUMNS.map((c) => (
                      <td
                        key={c.label}
                        className={cn("max-w-[14rem] truncate px-2 py-1.5 whitespace-nowrap", c.align === "right" && "text-right")}
                      >
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-xs">
        <label className="text-muted-foreground flex items-center gap-1.5">
          Rows
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border-border bg-background rounded-md border px-1.5 py-1"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border-border hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 disabled:opacity-40"
          >
            <ChevronLeft className="size-4" /> Prev
          </button>
          <span className="text-muted-foreground">
            {pages > 0 ? `Page ${page} / ${pages}` : "—"}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page >= pages}
            className="border-border hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2 py-1 disabled:opacity-40"
          >
            Next <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
