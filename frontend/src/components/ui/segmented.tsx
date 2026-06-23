"use client";

import { m } from "motion/react";

import { SPRING } from "@/lib/motion/tokens";
import { cn } from "@/lib/utils";

/**
 * Segmented control with a sliding `layoutId` pill (the maroon highlight FLIPs between
 * options). Generic over the option key. NOTE: each instance needs a UNIQUE `layoutId` —
 * Framer matches shared elements globally, so a repeated id would slide the pill between cards.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
  layoutId: string;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("bg-muted/60 flex gap-0.5 rounded-lg p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-pressed={value === o.key}
          className={cn(
            "relative rounded-md px-2.5 py-1 text-xs transition-colors",
            value === o.key ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === o.key && (
            <m.span
              layoutId={layoutId}
              className="bg-primary absolute inset-0 rounded-md"
              transition={SPRING.layout}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
