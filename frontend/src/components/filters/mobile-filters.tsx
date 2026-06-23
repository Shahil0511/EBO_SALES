"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import { FilterRailContent } from "@/components/filters/filter-rail-content";

/** Mobile-only: a floating button that opens the filter rail as a slide-in drawer. */
export function MobileFilters() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open filters"
        className="bg-primary text-primary-foreground fixed right-4 bottom-4 z-30 grid size-12 place-items-center rounded-full shadow-lg"
      >
        <SlidersHorizontal className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="bg-sidebar absolute inset-y-0 left-0 w-80 max-w-[85%] overflow-y-auto shadow-xl"
          >
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <FilterRailContent />
          </div>
        </div>
      )}
    </div>
  );
}
