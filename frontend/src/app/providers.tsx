"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, MotionConfig } from "motion/react";
import { useState } from "react";

import { makeQueryClient } from "@/lib/query";

// Code-split motion's feature bundle out of the initial JS (loaded on first animation).
const loadFeatures = () => import("@/lib/motion/features").then((mod) => mod.default);

/**
 * Client-side providers wrapper, mounted once in the root layout.
 * - QueryClient: lazy + stable across re-renders (App Router pattern; a new client per render drops cache).
 * - LazyMotion(strict): lazy-loads motion features; `strict` forces the lighter `<m.div>` over `<motion.div>`.
 * - MotionConfig(reducedMotion="user"): global governor — every motion component auto-degrades
 *   transform/layout → opacity-only when the OS requests reduced motion.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={loadFeatures} strict>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
