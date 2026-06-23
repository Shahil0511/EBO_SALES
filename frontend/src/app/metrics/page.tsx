import { Suspense } from "react";

import { MetricRoute } from "@/components/metrics/metric-route";

/**
 * KPI drill-down route: /metrics?m=<metric>&<filters>. A static route (the metric is a query
 * param, not a dynamic segment) + a server component that renders the client route under one
 * Suspense boundary — mirroring the dashboard page, which renders reliably in this dev env.
 */
export default function MetricPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground p-6 text-sm">Loading…</div>}>
      <MetricRoute />
    </Suspense>
  );
}
