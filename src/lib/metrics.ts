/**
 * Metricas Prometheus (prom-client). SOLO runtime Node.js.
 * Se expone en GET /metrics y Prometheus (local) hace scraping de ese endpoint.
 *
 * Contiene:
 *  - Metricas por defecto de Node.js/proceso: CPU, memoria, heap, event loop
 *    lag, garbage collection, uptime...
 *  - nova_app_info: gauge con la version de la app y de Node.
 *  - nova_http_requests_total / nova_http_request_duration_seconds:
 *    peticiones atendidas por los Route Handlers (ver withRouteMetrics).
 *  - nova_business_operations_total / nova_business_operation_duration_seconds:
 *    operaciones de negocio clave (registro, login, agregar al carrito,
 *    confirmar pedido) medidas desde los Server Actions.
 */
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";

// Singleton: Next recarga los modulos en desarrollo y prom-client lanza error
// si se registra dos veces la misma metrica.
const globalForMetrics = globalThis as unknown as {
  __novaMetrics?: ReturnType<typeof build>;
};

function build() {
  const registry = new Registry();
  registry.setDefaultLabels({ app: "novamarket" });
  collectDefaultMetrics({ register: registry, prefix: "nova_" });

  new Gauge({
    name: "nova_app_info",
    help: "Informacion de la aplicacion (valor siempre 1)",
    labelNames: ["version", "node_version"],
    registers: [registry],
  }).set(
    {
      version: process.env.npm_package_version ?? "1.0.0",
      node_version: process.version,
    },
    1,
  );

  const httpRequestsTotal = new Counter({
    name: "nova_http_requests_total",
    help: "Total de peticiones HTTP atendidas por los route handlers",
    labelNames: ["method", "route", "status"],
    registers: [registry],
  });

  const httpRequestDuration = new Histogram({
    name: "nova_http_request_duration_seconds",
    help: "Duracion de las peticiones HTTP (route handlers) en segundos",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2],
    registers: [registry],
  });

  const businessOpsTotal = new Counter({
    name: "nova_business_operations_total",
    help: "Operaciones de negocio ejecutadas (registro, login, carrito, pedido)",
    labelNames: ["operation", "result"],
    registers: [registry],
  });

  const businessOpDuration = new Histogram({
    name: "nova_business_operation_duration_seconds",
    help: "Duracion de las operaciones de negocio en segundos",
    labelNames: ["operation"],
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    registers: [registry],
  });

  return {
    registry,
    httpRequestsTotal,
    httpRequestDuration,
    businessOpsTotal,
    businessOpDuration,
  };
}

export const metrics = (globalForMetrics.__novaMetrics ??= build());
