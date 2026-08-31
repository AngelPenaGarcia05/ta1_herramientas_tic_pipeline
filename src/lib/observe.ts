/**
 * Helpers de instrumentacion. Solo se usan desde codigo que corre en Node
 * (Route Handlers y Server Actions).
 */
import { metrics } from "@/lib/metrics";

/** Envuelve un Route Handler para medir peticiones y tiempos de respuesta. */
export function withRouteMetrics<Args extends unknown[]>(
  route: string,
  handler: (req: Request, ...args: Args) => Promise<Response> | Response,
) {
  return async (req: Request, ...args: Args): Promise<Response> => {
    const start = process.hrtime.bigint();
    let status = 500;
    try {
      const res = await handler(req, ...args);
      status = res.status;
      return res;
    } finally {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = { method: req.method, route, status: String(status) };
      metrics.httpRequestsTotal.inc(labels);
      metrics.httpRequestDuration.observe(labels, seconds);
    }
  };
}

export type BusinessOp =
  | "register"
  | "login"
  | "cart_add"
  | "cart_update"
  | "checkout"
  | "order_status_change";

/**
 * Mide una operacion de negocio ejecutada desde un Server Action.
 * No cambia la logica: solo registra contador + histograma.
 */
export async function measureBusinessOp<T>(
  operation: BusinessOp,
  fn: () => Promise<T>,
): Promise<T> {
  const start = process.hrtime.bigint();
  try {
    const result = await fn();
    metrics.businessOpsTotal.inc({ operation, result: "success" });
    return result;
  } catch (err) {
    metrics.businessOpsTotal.inc({ operation, result: "error" });
    throw err;
  } finally {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    metrics.businessOpDuration.observe({ operation }, seconds);
  }
}

/** Version simple: solo incrementa el contador con un resultado explicito. */
export function countBusinessOp(
  operation: BusinessOp,
  result: "success" | "error" | "rejected",
) {
  metrics.businessOpsTotal.inc({ operation, result });
}
