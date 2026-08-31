import { describe, it, expect } from "vitest";
import { canTransition, ORDER_STATUS_FLOW } from "@/lib/orders";

describe("flujo de estados de pedido", () => {
  it("PENDING puede pasar a CONFIRMED o CANCELLED", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
  });

  it("no se puede saltar de PENDING directo a SHIPPED", () => {
    expect(canTransition("PENDING", "SHIPPED")).toBe(false);
  });

  it("DELIVERED y CANCELLED son estados finales", () => {
    expect(ORDER_STATUS_FLOW.DELIVERED).toEqual([]);
    expect(ORDER_STATUS_FLOW.CANCELLED).toEqual([]);
    expect(canTransition("DELIVERED", "SHIPPED")).toBe(false);
  });

  it("no se permite transicion al mismo estado", () => {
    expect(canTransition("CONFIRMED", "CONFIRMED")).toBe(false);
  });

  it("secuencia feliz completa es valida", () => {
    const seq = [
      "PENDING",
      "CONFIRMED",
      "PREPARING",
      "SHIPPED",
      "DELIVERED",
    ] as const;
    for (let i = 0; i < seq.length - 1; i++) {
      expect(canTransition(seq[i], seq[i + 1])).toBe(true);
    }
  });
});
