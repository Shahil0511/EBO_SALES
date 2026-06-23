import type { Transition } from "motion/react";

/**
 * Motion tokens — the SINGLE source of truth for every animation in the app.
 * Import these; never hardcode a duration/easing/spring in a component. Premium feel
 * comes from a *small* set of values applied everywhere (Linear/Stripe), calibrated a
 * notch calmer for our warm, editorial brand. Mirrored into globals.css for CSS transitions.
 *
 * This file is pure data (the `Transition` import is type-only, erased at build) so it is
 * safe to import from server OR client modules.
 */

/** Durations in SECONDS (motion's unit). Keep interactive motion in the 0.14–0.30 band. */
export const DURATION = {
  micro: 0.14, // hover, icon scale, row highlight, border-on-focus
  state: 0.2, // toggle, chevron, badge swap, count-up tick, in-place content
  overlay: 0.24, // dropdown, tooltip, modal/toast enter
  layout: 0.3, // drawer, accordion height, sidebar
} as const;

/** Milliseconds mirror — for the rare consumer that needs ms (Recharts `animationDuration`). */
export const DURATION_MS = {
  micro: 140,
  state: 200,
  overlay: 240,
  layout: 300,
  chart: 800, // Recharts area-draw on load
} as const;

/**
 * Cubic-bézier easings — three curves, no more. Enter decelerates and settles; exits
 * accelerate away; `standard` is the symmetric workhorse for reversible micro-motion.
 * Typed as mutable 4-tuples so they drop straight into a motion `ease:` prop.
 */
export const EASE = {
  out: [0.16, 1, 0.3, 1] as [number, number, number, number], // ENTER — "arrives and settles"
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number], // hover / reversible
  in: [0.4, 0, 1, 1] as [number, number, number, number], // EXIT — accelerate away
};

/** Stagger step (seconds) between siblings, and the cap on how many items ripple. */
export const STAGGER = 0.04; // 40ms reads as "life", not choreography
export const STAGGER_CAP = 6;

/**
 * Spring presets, tuned per surface. Use springs ONLY for physical/position/layout motion;
 * use the durations+easings above for opacity/color/tiny hover lifts. `satisfies` validates
 * each is a real motion Transition while keeping the literal `type: "spring"`.
 */
export const SPRING = {
  card: { type: "spring", stiffness: 480, damping: 40, mass: 0.8 }, // snappy, ZERO overshoot
  modal: { type: "spring", stiffness: 300, damping: 30, mass: 1 }, // gentle, faint life
  drawer: { type: "spring", stiffness: 240, damping: 32, mass: 1 }, // heavy, no overshoot
  layout: { type: "spring", stiffness: 400, damping: 38, mass: 1 }, // shared-element / layoutId
} as const satisfies Record<string, Transition>;
