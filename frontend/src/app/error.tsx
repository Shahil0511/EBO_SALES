"use client";

import { useEffect } from "react";

/**
 * Route error boundary — catches unexpected render crashes (per-section data errors are
 * handled inline by each section's `isError` state). Shows a friendly message + retry.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center p-8">
      <div className="max-w-md text-center">
        <h2 className="font-heading text-lg font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {error.message || "An unexpected error occurred while loading the dashboard."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground mt-4 rounded-md px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
