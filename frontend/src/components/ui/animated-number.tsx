"use client";

import { animate, m, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect } from "react";

import { EASE } from "@/lib/motion/tokens";

/**
 * Counts up to `value`, formatting EACH FRAME through `format`. Counting the RAW number and
 * formatting per frame is what lets our Indian Cr/L formatters (inr/num) work — a registry
 * "number ticker" only does Intl formatting and can't produce "₹1.2 Cr". The MotionValue
 * updates the text without a React re-render, so it's cheap.
 *
 * - First mount counts 0 → value. The KPIs never SSR (they're inside the client Suspense
 *   boundary), so there's no "₹0" hydration flash.
 * - On value change (filter change) counts previous → new.
 * - Reduced motion: initialises at the final value and snaps — no count.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 0.6,
  className,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(reduce ? value : 0);
  const text = useTransform(mv, (n) => format(n));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration, ease: EASE.out });
    return () => controls.stop();
  }, [value, reduce, duration, mv]);

  return <m.span className={className}>{text}</m.span>;
}
