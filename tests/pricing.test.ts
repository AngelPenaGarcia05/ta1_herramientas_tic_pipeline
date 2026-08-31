import { describe, it, expect } from "vitest";
import {
  lineSubtotalCents,
  calculateOrderTotals,
  assertStockAvailable,
  decrementStock,
  assertValidPrice,
  assertValidQuantity,
  StockError,
  ValidationError,
} from "@/lib/pricing";

describe("lineSubtotalCents", () => {
  it("multiplica precio unitario por cantidad", () => {
    expect(lineSubtotalCents({ unitPriceCents: 1999, quantity: 3 })).toBe(5997);
  });

  it("rechaza cantidades no enteras o menores a 1", () => {
    expect(() => lineSubtotalCents({ unitPriceCents: 100, quantity: 0 })).toThrow(
      ValidationError,
    );
    expect(() =>
      lineSubtotalCents({ unitPriceCents: 100, quantity: 1.5 }),
    ).toThrow(ValidationError);
  });

  it("rechaza precios negativos", () => {
    expect(() => lineSubtotalCents({ unitPriceCents: -1, quantity: 1 })).toThrow(
      ValidationError,
    );
  });
});

describe("calculateOrderTotals", () => {
  it("calcula subtotales y total en el servidor", () => {
    const totals = calculateOrderTotals([
      { productId: "a", productName: "A", unitPriceCents: 1000, quantity: 2 },
      { productId: "b", productName: "B", unitPriceCents: 550, quantity: 3 },
    ]);
    expect(totals.lines[0].subtotalCents).toBe(2000);
    expect(totals.lines[1].subtotalCents).toBe(1650);
    expect(totals.totalCents).toBe(3650);
    expect(totals.totalItems).toBe(5);
  });

  it("no confia en un total enviado por el cliente (siempre recalcula)", () => {
    const totals = calculateOrderTotals([
      { productId: "a", productName: "A", unitPriceCents: 12345, quantity: 7 },
    ]);
    expect(totals.totalCents).toBe(12345 * 7);
  });

  it("falla si el pedido no tiene lineas", () => {
    expect(() => calculateOrderTotals([])).toThrow(ValidationError);
  });
});

describe("assertStockAvailable", () => {
  const base = {
    productId: "p1",
    productName: "Producto 1",
    requestedQuantity: 2,
    availableStock: 5,
    active: true,
  };

  it("pasa cuando hay stock suficiente", () => {
    expect(() => assertStockAvailable([base])).not.toThrow();
  });

  it("no permite comprar mas unidades de las disponibles", () => {
    expect(() =>
      assertStockAvailable([{ ...base, requestedQuantity: 6 }]),
    ).toThrow(StockError);
  });

  it("permite comprar exactamente el stock disponible", () => {
    expect(() =>
      assertStockAvailable([{ ...base, requestedQuantity: 5 }]),
    ).not.toThrow();
  });

  it("rechaza productos inactivos", () => {
    expect(() => assertStockAvailable([{ ...base, active: false }])).toThrow(
      StockError,
    );
  });

  it("rechaza stock negativo en la base", () => {
    expect(() =>
      assertStockAvailable([
        { ...base, availableStock: -1, requestedQuantity: 1 },
      ]),
    ).toThrow(StockError);
  });
});

describe("decrementStock", () => {
  it("descuenta unidades correctamente", () => {
    expect(decrementStock(10, 3)).toBe(7);
  });

  it("nunca deja el stock en negativo", () => {
    expect(() => decrementStock(2, 5)).toThrow(StockError);
  });

  it("permite llegar a 0", () => {
    expect(decrementStock(5, 5)).toBe(0);
  });
});

describe("validadores basicos", () => {
  it("assertValidPrice acepta enteros >= 0", () => {
    expect(() => assertValidPrice(0)).not.toThrow();
    expect(() => assertValidPrice(100)).not.toThrow();
    expect(() => assertValidPrice(10.5)).toThrow(ValidationError);
  });

  it("assertValidQuantity exige entero >= 1", () => {
    expect(() => assertValidQuantity(1)).not.toThrow();
    expect(() => assertValidQuantity(0)).toThrow(ValidationError);
  });
});
