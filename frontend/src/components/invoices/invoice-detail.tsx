"use client";

import Link from "next/link";
import { useState } from "react";

import { PageCrumb } from "@/components/layout/page-crumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceDetail } from "@/lib/api/hooks/use-invoice-detail";
import { serializeFilters } from "@/lib/filters";
import { inr, num } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDateTime(iso: string): string {
  const [date, time] = iso.split("T");
  const [y, m, d] = date.split("-");
  const hm = (time ?? "").slice(0, 5);
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}${hm ? `, ${hm}` : ""}`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

/** Small product thumbnail for a bill line, with an image-error fallback. */
function LineThumb({ url, code }: { url: string | null | undefined; code: string | null }) {
  const [err, setErr] = useState(false);
  if (url && !err) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={code ?? ""}
        loading="lazy"
        onError={() => setErr(true)}
        className="bg-muted size-11 rounded object-contain"
      />
    );
  }
  return (
    <div className="bg-muted text-muted-foreground grid size-11 place-items-center rounded font-mono text-[8px]">
      {code?.slice(0, 5) ?? "—"}
    </div>
  );
}

export function InvoiceDetail({
  invoiceNo,
  dateFrom,
  dateTo,
}: {
  invoiceNo: string;
  dateFrom: string;
  dateTo: string;
}) {
  const { filters } = useFilters();
  const { data, isLoading, isError } = useInvoiceDetail(invoiceNo, dateFrom, dateTo);
  const qs = serializeFilters(filters).toString();

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <PageCrumb title={`Invoice ${invoiceNo}`} />
      {isError ? (
          <div className="border-border bg-card text-destructive rounded-xl border p-6 text-sm">
            Invoice not found in the selected window.
          </div>
        ) : isLoading || !data ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </>
        ) : (
          <>
            {/* Bill header */}
            <section className="border-border bg-card shadow-card rounded-xl border p-4">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <Field label="Date" value={fmtDateTime(data.date)} />
                <Field label="Store" value={data.store} />
                <Field label="Channel" value={data.channel} />
                <Field label="Sales staff" value={data.salesperson} />
                <Field label="Customer" value={data.customer} />
                <Field label="Mobile" value={data.mobile} />
                <Field label="Items" value={`${data.lineCount} lines · ${num(data.totalQty)} qty`} />
                <Field
                  label="Invoice total"
                  value={<span className="text-primary font-semibold">{inr(data.totalNet)}</span>}
                />
              </dl>
            </section>

            {/* Line items */}
            <section className="border-border bg-card shadow-card rounded-xl border p-4">
              <h3 className="font-heading mb-3 text-sm font-semibold">Line items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-border border-b text-left">
                      <th scope="col" className="px-2 py-2 font-medium"></th>
                      <th scope="col" className="px-2 py-2 font-medium">Product</th>
                      <th scope="col" className="px-2 py-2 font-medium">SKU</th>
                      <th scope="col" className="px-2 py-2 font-medium">Category</th>
                      <th scope="col" className="px-2 py-2 font-medium">Brand</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Qty</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">MRP</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Disc</th>
                      <th scope="col" className="px-2 py-2 text-right font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((l, i) => (
                      <tr key={`${l.sku}-${i}`} className="border-border/60 hover:bg-muted/40 border-b transition-colors">
                        <td className="px-2 py-1.5">
                          <LineThumb url={l.imageUrl} code={l.productCode} />
                        </td>
                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">
                          {l.productCode ? (
                            <Link
                              href={`/products?code=${encodeURIComponent(l.productCode)}&${qs}`}
                              className="hover:text-primary hover:underline"
                            >
                              {l.productCode}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-2 py-1.5 font-mono whitespace-nowrap">{l.sku}</td>
                        <td className="max-w-[12rem] truncate px-2 py-1.5">{l.category}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{l.brand}</td>
                        <td className="px-2 py-1.5 text-right">{l.qty}</td>
                        <td className="px-2 py-1.5 text-right">{inr(l.mrp)}</td>
                        <td className="px-2 py-1.5 text-right">{inr(l.discount)}</td>
                        <td className="px-2 py-1.5 text-right font-medium">{inr(l.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
    </div>
  );
}
