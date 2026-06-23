"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Collapsible filter group: a header (title + count badge + chevron) over a body.
 * `badge` shows the active-selection count (or "All" when none). Used by every group.
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
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-accent-foreground",
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
      {open && <div className="border-border border-t px-3 py-2.5">{children}</div>}
    </div>
  );
}
