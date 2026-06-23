"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useProductDetail } from "@/lib/api/hooks/use-product-detail";
import { inr, num } from "@/lib/format";
import { useFilters } from "@/lib/use-filters";

export function ProductDetailModal({ code, onClose }: { code: string | null; onClose: () => void }) {
  const { filters } = useFilters();
  const { data, isLoading, isError } = useProductDetail(filters, code);
  const [imgError, setImgError] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Reset the image-error flag when the viewed product changes, so a prior product's
  // failed image doesn't hide a valid one (adjust-state-during-render).
  const [prevCode, setPrevCode] = useState(code);
  if (code !== prevCode) {
    setPrevCode(code);
    setImgError(false);
  }

  useEffect(() => {
    if (!code) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    // Move focus into the dialog on open; restore it to the trigger on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [code, onClose]);

  if (!code) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Product ${code}`}
        className="bg-card border-border max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-heading text-base font-semibold">{code}</h3>
            {data && <p className="text-muted-foreground text-xs">{data.variantCount} variants</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-transform hover:scale-110"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {isError ? (
          <p className="text-destructive text-sm">Product not found in this window.</p>
        ) : isLoading || !data ? (
          <div className="bg-muted h-40 animate-pulse rounded-lg" />
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="bg-muted size-28 shrink-0 overflow-hidden rounded-lg">
                {data.imageUrl && !imgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.imageUrl}
                    alt={code}
                    onError={() => setImgError(true)}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground grid size-full place-items-center font-mono text-xs">
                    {code}
                  </div>
                )}
              </div>
              <dl className="grid flex-1 grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground text-xs">Net revenue</dt>
                  <dd className="font-medium">{inr(data.netRevenue)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Units</dt>
                  <dd className="font-medium">{num(data.units)}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h4 className="text-muted-foreground mb-1.5 text-xs font-medium">Variants</h4>
              <ul className="divide-border divide-y text-sm">
                {data.variants.map((v) => (
                  <li key={v.sku} className="flex items-center justify-between py-1.5">
                    <span className="font-mono text-xs">{v.sku}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">{num(v.units)} sold</span>
                      <span className="font-medium">{inr(v.netRevenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
