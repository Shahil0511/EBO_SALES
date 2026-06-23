"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { MetricDetail } from "@/components/metrics/metric-detail";
import { isMetricKey } from "@/lib/api/hooks/use-metric-detail";

/** Reads the `?m=<metric>` query param and renders its detail (or an unknown-metric notice). */
export function MetricRoute() {
  const raw = useSearchParams().get("m");

  if (!raw || !isMetricKey(raw)) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-8 text-center">
        <div>
          <h1 className="font-heading text-lg font-semibold">Unknown metric</h1>
          <p className="text-muted-foreground mt-1 text-sm">That metric doesn&apos;t exist.</p>
          <Link
            href="/"
            className="bg-primary text-primary-foreground mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <MetricDetail metric={raw} />;
}
