"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

import { DURATION, EASE } from "@/lib/motion/tokens";

// Warm ink-tinted shadows (--foreground ≈ rgb(43 36 32)) — never pure black on cream.
// The resting shadow has a matching 2-layer shape so Framer interpolates to hover smoothly.
const REST_SHADOW = "0 1px 2px rgba(43,36,32,0.04), 0 0 0 0 rgba(43,36,32,0)";
const HOVER_SHADOW = "0 4px 12px -2px rgba(43,36,32,0.10), 0 2px 4px -2px rgba(43,36,32,0.06)";

/** Recipe exported so non-div surfaces (e.g. the product <button>) reuse the EXACT lift. */
export const liftRest = { y: 0, boxShadow: REST_SHADOW };
export const liftHover = { y: -2, boxShadow: HOVER_SHADOW };
export const liftTransition = { duration: DURATION.micro, ease: EASE.standard };

/**
 * Wraps a CARD surface so it lifts 2px with a soft warm shadow on hover. A tween (not a
 * spring) — a 2px deterministic lift; a spring would overshoot and look like a glitch.
 * Under reduced-motion MotionConfig drops the `y` automatically; only the shadow remains.
 */
export function HoverLift({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div className={className} initial={liftRest} whileHover={liftHover} transition={liftTransition}>
      {children}
    </m.div>
  );
}
