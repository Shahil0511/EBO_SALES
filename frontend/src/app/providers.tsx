"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { makeQueryClient } from "@/lib/query";

/**
 * Client-side providers wrapper, mounted once in the root layout. `useState(makeQueryClient)`
 * creates the QueryClient lazily and keeps the SAME instance across re-renders (the
 * recommended App Router pattern — a new client per render would drop the cache).
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
