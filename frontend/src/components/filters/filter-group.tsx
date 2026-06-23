"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { useState } from "react";

import { DURATION, EASE } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

/**
 * Collapsible filter group: a header (title + count badge + chevron) over a body that
 * animates its HEIGHT open/closed (the sanctioned layout-property exception). `badge` shows
 * the active-selection count (or "All" when none). Used by every group.
 */
export function FilterGroup({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const active = badge !== undefined && badge > 0;

  return (
    <div className="border-border bg-card rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2.5 text-sm"
      >
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-2">
          {badge !== undefined && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px]",
                active ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground",
              )}
            >
              {active ? badge : "All"}
            </span>
          )}
          <ChevronDown
            className={cn("text-muted-foreground size-4 transition-transform", open && "rotate-180")}
          />
        </span>
      </button>
      {/* initial={false}: never animate the height on first paint, only on user toggle. */}
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: DURATION.state, ease: EASE.standard }}
            className="overflow-hidden"
          >
            <div className="border-border border-t px-3 py-2.5">{children}</div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
