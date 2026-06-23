"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useState } from "react";

import { FilterRailContent } from "@/components/filters/filter-rail-content";
import { DURATION, SPRING } from "@/lib/motion/tokens";

/** Mobile-only: a floating button that opens the filter rail as a spring slide-in drawer. */
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
        className="bg-primary text-primary-foreground fixed right-4 bottom-4 z-30 grid size-12 place-items-center rounded-full shadow-lg transition-transform hover:scale-110"
      >
        <SlidersHorizontal className="size-5" />
      </button>

      {/* Backdrop fades, panel slides (spring → MotionConfig drops the x-slide under reduced motion). */}
      <AnimatePresence>
        {open && (
          <m.div
            key="drawer-backdrop"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.overlay }}
          />
        )}
        {open && (
          <m.div
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="bg-sidebar fixed inset-y-0 left-0 z-50 w-80 max-w-[85%] overflow-y-auto shadow-xl"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={SPRING.drawer}
          >
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="text-muted-foreground hover:text-foreground transition-transform hover:scale-110"
              >
                <X className="size-5" />
              </button>
            </div>
            <FilterRailContent />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
