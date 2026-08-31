import { NextResponse } from "next/server";
import { withRouteMetrics } from "@/lib/observe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/health -> healthcheck simple.
 * Lo usan docker-compose (healthcheck) y Render para saber si la app vive.
 * Va instrumentado: cada llamada suma a nova_http_requests_total.
 */
export const GET = withRouteMetrics("/api/health", async () => {
  return NextResponse.json({
    status: "ok",
    service: "novamarket",
    timestamp: new Date().toISOString(),
  });
});
