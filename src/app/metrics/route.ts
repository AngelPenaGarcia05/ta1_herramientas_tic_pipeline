import { NextResponse } from "next/server";
import { metrics } from "@/lib/metrics";

// Siempre dinamico y en runtime Node.js (prom-client no funciona en Edge).
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /metrics -> exposicion de metricas en formato Prometheus.
 * Prometheus (local) hace scraping de este endpoint.
 * No se instrumenta a si mismo para no contaminar los contadores con scrapes.
 */
export async function GET() {
  const body = await metrics.registry.metrics();
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": metrics.registry.contentType },
  });
}
