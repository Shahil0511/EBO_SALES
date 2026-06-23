import type { NextConfig } from "next";

// The backend origin the dev rewrite proxies to (uvicorn). Server-side only — NOT
// exposed to the browser, so no NEXT_PUBLIC_ prefix. Defaults to the local API.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  // The browser always calls same-origin `/api/v1/...`; Next rewrites (proxies) it to
  // the FastAPI backend. Same-origin → no CORS needed, and the backend stays untouched.
  // In production Nginx does the same, so the app code never knows the API's real host.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_PROXY_TARGET}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
