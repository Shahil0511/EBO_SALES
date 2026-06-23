import { cn } from "@/lib/utils";

/**
 * Loading placeholder with a warm shimmer sweep (replaces `animate-pulse`). shadcn-style
 * API + conventions (`data-slot`, prop spread) so it drops in anywhere: <Skeleton className="h-24 w-full" />.
 *
 * No JS: the `.shimmer` class (globals.css) animates a gradient; under prefers-reduced-motion
 * the global guard flattens it to solid muted. No "use client" needed — it's pure markup.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div aria-hidden data-slot="skeleton" className={cn("shimmer rounded-md", className)} {...props} />;
}
