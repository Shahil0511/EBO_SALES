"use client";

import { useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";

/**
 * Reduced-motion strategy, imperative half.
 *
 * `<MotionConfig reducedMotion="user">` (providers.tsx) auto-degrades DECLARATIVE motion
 * components — it drops transform/layout and keeps opacity when the OS prefers reduced
 * motion. But it does NOT govern imperative animation: `animate()` (count-up) and
 * `useAnimate` keyframes (shake). Those check `useReducedMotion()` themselves and snap to
 * the final state. These helpers keep that behaviour identical everywhere.
 */

/** Returns an instant transition when the user prefers reduced motion, else the given one. */
export function useSafeTransition(transition: Transition): Transition {
  const reduce = useReducedMotion();
  return reduce ? { duration: 0 } : transition;
}

/** Clearer name at imperative call sites (count-up, shake) that must snap to a final value. */
export { useReducedMotion as usePrefersReducedMotion };
