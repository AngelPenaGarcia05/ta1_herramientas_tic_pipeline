/**
 * Pruebas de la capa de observabilidad.
 *
 * Cubren:
 *  - src/lib/metrics.ts  -> construccion del registro Prometheus y metricas declaradas
 *  - src/lib/observe.ts  -> withRouteMetrics, measureBusinessOp y countBusinessOp
 *
 * No dependen de la base de datos ni de un servidor HTTP: solo del registro
 * en memoria de prom-client.
 */
import { describe, it, expect } from "vitest";
import { metrics } from "@/lib/metrics";
import {
  withRouteMetrics,
  measureBusinessOp,
  countBusinessOp,
} from "@/lib/observe";

/** Lee el valor acumulado de un contador para un subconjunto de etiquetas. */
async function counterValue(
  name: string,
  labels: Record<string, string>,
): Promise<number> {
  const json = await metrics.registry.getMetricsAsJSON();
  const metric = json.find((m) => m.name === name);
  if (!metric) return 0;
  const match = (metric.values as Array<{ value: number; labels: Record<string, string> }>)
    .filter((v) =>
      Object.entries(labels).every(([k, val]) => String(v.labels[k]) === val),
    );
  return match.reduce((acc, v) => acc + v.value, 0);
}

describe("metrics: registro Prometheus", () => {
  it("expone el registro con la etiqueta por defecto de la aplicacion", async () => {
    const body = await metrics.registry.metrics();
    expect(body).toContain('app="novamarket"');
  });

  it("declara las metricas de negocio y de HTTP", async () => {
    const names = (await metrics.registry.getMetricsAsJSON()).map((m) => m.name);
    expect(names).toContain("nova_app_info");
    expect(names).toContain("nova_http_requests_total");
    expect(names).toContain("nova_http_request_duration_seconds");
    expect(names).toContain("nova_business_operations_total");
    expect(names).toContain("nova_business_operation_duration_seconds");
  });

  it("incluye las metricas por defecto del proceso con el prefijo nova_", async () => {
    const names = (await metrics.registry.getMetricsAsJSON()).map((m) => m.name);
    expect(names.some((n) => n.startsWith("nova_process_"))).toBe(true);
  });

  it("nova_app_info reporta version y version de Node", async () => {
    const json = await metrics.registry.getMetricsAsJSON();
    const info = json.find((m) => m.name === "nova_app_info");
    const labels = (info?.values as Array<{ labels: Record<string, string> }>)[0].labels;
    expect(labels.node_version).toBe(process.version);
    expect(labels.version).toBeTruthy();
  });
});

describe("observe: withRouteMetrics", () => {
  it("devuelve la respuesta del handler sin alterarla", async () => {
    const handler = withRouteMetrics("/test/ok", async () =>
      new Response("hola", { status: 200 }),
    );
    const res = await handler(new Request("http://localhost/test/ok"));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("hola");
  });

  it("cuenta la peticion con metodo, ruta y codigo de estado", async () => {
    const labels = { method: "GET", route: "/test/contador", status: "200" };
    const antes = await counterValue("nova_http_requests_total", labels);

    const handler = withRouteMetrics("/test/contador", async () =>
      new Response(null, { status: 200 }),
    );
    await handler(new Request("http://localhost/test/contador"));

    const despues = await counterValue("nova_http_requests_total", labels);
    expect(despues).toBe(antes + 1);
  });

  it("registra la duracion de la peticion", async () => {
    const handler = withRouteMetrics("/test/duracion", async () =>
      new Response(null, { status: 200 }),
    );
    await handler(new Request("http://localhost/test/duracion"));

    const json = await metrics.registry.getMetricsAsJSON();
    const hist = json.find((m) => m.name === "nova_http_request_duration_seconds");
    const muestras = (hist?.values as Array<{ labels: Record<string, string> }>)
      .filter((v) => v.labels.route === "/test/duracion");
    expect(muestras.length).toBeGreaterThan(0);
  });

  it("si el handler lanza, propaga el error y contabiliza estado 500", async () => {
    const labels = { method: "GET", route: "/test/error", status: "500" };
    const antes = await counterValue("nova_http_requests_total", labels);

    const handler = withRouteMetrics("/test/error", async () => {
      throw new Error("fallo simulado");
    });

    await expect(
      handler(new Request("http://localhost/test/error")),
    ).rejects.toThrow("fallo simulado");

    const despues = await counterValue("nova_http_requests_total", labels);
    expect(despues).toBe(antes + 1);
  });

  it("propaga el metodo HTTP real de la peticion", async () => {
    const labels = { method: "POST", route: "/test/metodo", status: "201" };
    const antes = await counterValue("nova_http_requests_total", labels);

    const handler = withRouteMetrics("/test/metodo", async () =>
      new Response(null, { status: 201 }),
    );
    await handler(new Request("http://localhost/test/metodo", { method: "POST" }));

    expect(await counterValue("nova_http_requests_total", labels)).toBe(antes + 1);
  });
});

describe("observe: measureBusinessOp", () => {
  it("devuelve el resultado y lo cuenta como success", async () => {
    const labels = { operation: "checkout", result: "success" };
    const antes = await counterValue("nova_business_operations_total", labels);

    const valor = await measureBusinessOp("checkout", async () => 42);

    expect(valor).toBe(42);
    expect(await counterValue("nova_business_operations_total", labels)).toBe(antes + 1);
  });

  it("cuenta como error y relanza cuando la operacion falla", async () => {
    const labels = { operation: "login", result: "error" };
    const antes = await counterValue("nova_business_operations_total", labels);

    await expect(
      measureBusinessOp("login", async () => {
        throw new Error("credenciales invalidas");
      }),
    ).rejects.toThrow("credenciales invalidas");

    expect(await counterValue("nova_business_operations_total", labels)).toBe(antes + 1);
  });

  it("registra la duracion de la operacion de negocio", async () => {
    await measureBusinessOp("register", async () => "ok");

    const json = await metrics.registry.getMetricsAsJSON();
    const hist = json.find((m) => m.name === "nova_business_operation_duration_seconds");
    const muestras = (hist?.values as Array<{ labels: Record<string, string> }>)
      .filter((v) => v.labels.operation === "register");
    expect(muestras.length).toBeGreaterThan(0);
  });
});

describe("observe: countBusinessOp", () => {
  it("incrementa el contador con el resultado indicado", async () => {
    const labels = { operation: "cart_add", result: "rejected" };
    const antes = await counterValue("nova_business_operations_total", labels);

    countBusinessOp("cart_add", "rejected");

    expect(await counterValue("nova_business_operations_total", labels)).toBe(antes + 1);
  });

  it("acepta los tres resultados posibles", async () => {
    countBusinessOp("cart_update", "success");
    countBusinessOp("cart_update", "error");
    countBusinessOp("order_status_change", "success");

    expect(
      await counterValue("nova_business_operations_total", { operation: "cart_update" }),
    ).toBeGreaterThanOrEqual(2);
  });
});
