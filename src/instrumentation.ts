/**
 * Hook de instrumentacion de Next.js.
 * Se ejecuta una vez al arrancar el servidor. Aqui inicializamos el registro
 * de metricas Prometheus (solo en el runtime Node.js).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/metrics");
  }
}
