"use client";

import { useEffect, useState } from "react";

// F1 connectivity probe: the browser calls same-origin `/api/v1/health`, Next rewrites
// it to the FastAPI backend, and we render the result. This page is temporary — F2
// replaces it with the real dashboard shell.

type Health = { status: string; database: string };
type Probe = { state: "loading" } | { state: "ok"; data: Health } | { state: "error"; message: string };

export default function Home() {
  const [probe, setProbe] = useState<Probe>({ state: "loading" });

  useEffect(() => {
    fetch("/api/v1/health")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data: Health) => setProbe({ state: "ok", data }))
      .catch((e: Error) => setProbe({ state: "error", message: e.message }));
  }, []);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-10 font-sans">
      <h1 className="text-2xl font-semibold">LIBAS Sales Intelligence</h1>
      <p className="text-zinc-600">
        F1 — API proxy check (browser → Next rewrite → FastAPI <code>/api/v1/health</code>):
      </p>
      <pre className="rounded-md bg-zinc-100 p-4 text-sm">
        {probe.state === "loading"
          ? "checking…"
          : probe.state === "ok"
            ? JSON.stringify(probe.data, null, 2)
            : `error: ${probe.message}  (is the backend running on :8000?)`}
      </pre>
    </main>
  );
}
