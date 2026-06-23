"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";

import { DURATION, EASE, STAGGER } from "@/lib/motion/tokens";

/**
 * Reveals its children with a subtle fade + small rise the first time they scroll into view.
 * `<MotionConfig reducedMotion="user">` auto-drops the `y` translate (opacity-only) when the
 * user opts out — so there's no reduced-motion branch to write here.
 *
 * `m.div` (not `motion.div`) because <LazyMotion strict> requires the lighter `m` component.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 8,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
}) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-40px" }}
      transition={{ duration: DURATION.state, ease: EASE.out, delay }}
    >
      {children}
    </m.div>
  );
}

/**
 * Staggered container: its direct <RevealItem> children animate in 40ms apart when the group
 * scrolls into view. Use for the KPI row / product grid. Variants drive the children, so only
 * one in-view observer runs for the whole group.
 */
export function RevealGroup({
  children,
  className,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
}) {
  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: STAGGER } } }}
    >
      {children}
    </m.div>
  );
}

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.state, ease: EASE.out } },
};

/** A single staggered child of <RevealGroup>. */
export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div className={className} variants={itemVariants}>
      {children}
    </m.div>
  );
}
