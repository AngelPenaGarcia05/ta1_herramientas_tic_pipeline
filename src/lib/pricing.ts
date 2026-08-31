/**
 * Logica de negocio pura (sin acceso a base de datos) para:
 *  - calculo de totales de un pedido
 *  - validacion de stock
 *
 * Estas funciones se usan tanto en los Server Actions / Route Handlers
 * como en las pruebas unitarias.
 */

export interface PriceInput {
  /** Precio unitario en centavos (entero, >= 0) */
  unitPriceCents: number;
  /** Cantidad solicitada (entero, >= 1) */
  quantity: number;
}

export interface StockCheckItem {
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableStock: number;
  active: boolean;
}

export interface OrderLine extends PriceInput {
  productId: string;
  productName: string;
}

export interface OrderTotals {
  lines: Array<{
    productId: string;
    productName: string;
    unitPriceCents: number;
    quantity: number;
    subtotalCents: number;
  }>;
  totalCents: number;
  totalItems: number;
}

export class StockError extends Error {
  constructor(
    message: string,
    public readonly productId: string,
  ) {
    super(message);
    this.name = "StockError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/** Subtotal de una linea: precio unitario * cantidad. */
export function lineSubtotalCents(input: PriceInput): number {
  assertValidPrice(input.unitPriceCents);
  assertValidQuantity(input.quantity);
  return input.unitPriceCents * input.quantity;
}

/**
 * Calcula los totales de un pedido en el servidor a partir de las lineas.
 * Nunca confia en un total enviado por el cliente.
 */
export function calculateOrderTotals(lines: OrderLine[]): OrderTotals {
  if (lines.length === 0) {
    throw new ValidationError("El pedido no contiene productos.");
  }

  const computedLines = lines.map((line) => {
    const subtotalCents = lineSubtotalCents(line);
    return {
      productId: line.productId,
      productName: line.productName,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
      subtotalCents,
    };
  });

  const totalCents = computedLines.reduce((acc, l) => acc + l.subtotalCents, 0);
  const totalItems = computedLines.reduce((acc, l) => acc + l.quantity, 0);

  return { lines: computedLines, totalCents, totalItems };
}

/**
 * Valida el stock de un conjunto de items.
 * Reglas:
 *  - Un producto inactivo no se puede comprar.
 *  - La cantidad solicitada debe ser >= 1.
 *  - No se puede comprar mas unidades de las disponibles.
 * Lanza StockError con el primer problema encontrado.
 */
export function assertStockAvailable(items: StockCheckItem[]): void {
  for (const item of items) {
    if (!item.active) {
      throw new StockError(
        `El producto "${item.productName}" ya no esta disponible.`,
        item.productId,
      );
    }
    assertValidQuantity(item.requestedQuantity);
    if (item.availableStock < 0) {
      throw new StockError(
        `El stock del producto "${item.productName}" es invalido.`,
        item.productId,
      );
    }
    if (item.requestedQuantity > item.availableStock) {
      throw new StockError(
        `Stock insuficiente para "${item.productName}". Disponibles: ${item.availableStock}, solicitados: ${item.requestedQuantity}.`,
        item.productId,
      );
    }
  }
}

/** Nuevo stock luego de descontar una compra. Nunca puede quedar negativo. */
export function decrementStock(currentStock: number, quantity: number): number {
  assertValidQuantity(quantity);
  const next = currentStock - quantity;
  if (next < 0) {
    throw new StockError(
      `La operacion dejaria el stock en negativo (${next}).`,
      "unknown",
    );
  }
  return next;
}

export function assertValidPrice(priceCents: number): void {
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new ValidationError(
      `Precio invalido: ${priceCents}. Debe ser un entero >= 0 (centavos).`,
    );
  }
}

export function assertValidQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new ValidationError(
      `Cantidad invalida: ${quantity}. Debe ser un entero >= 1.`,
    );
  }
}
