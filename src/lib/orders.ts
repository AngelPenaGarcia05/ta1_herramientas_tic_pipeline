import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertStockAvailable,
  calculateOrderTotals,
  StockError,
  ValidationError,
} from "@/lib/pricing";
import type { CheckoutInput } from "@/lib/validations";

/** Transiciones de estado permitidas para un pedido. */
export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  return ORDER_STATUS_FLOW[from].includes(to);
}

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}

/**
 * Crea un pedido a partir del carrito del usuario.
 *
 * Reglas aplicadas dentro de una transaccion:
 *  - Se vuelven a leer precio, stock y estado (active) desde la BD.
 *  - Se valida stock nuevamente (no confiamos en el cliente).
 *  - El total se calcula en el servidor.
 *  - Se descuenta el stock de forma atomica y con guardas para que
 *    nunca quede negativo.
 *  - El carrito se vacia.
 *
 * El pedido se crea en estado PENDING y su stock ya queda reservado.
 */
export async function createOrderFromCart(
  userId: string,
  shipping: CheckoutInput,
) {
  return prisma.$transaction(async (tx) => {
    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: true },
    });

    if (!cart || cart.items.length === 0) {
      throw new CheckoutError("Tu carrito esta vacio.");
    }

    const productIds = cart.items.map((i) => i.productId);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });
    const productById = new Map(products.map((p) => [p.id, p]));

    // Validacion de stock con datos frescos de la BD
    const stockItems = cart.items.map((item) => {
      const product = productById.get(item.productId);
      if (!product) {
        throw new CheckoutError("Un producto de tu carrito ya no existe.");
      }
      return {
        productId: product.id,
        productName: product.name,
        requestedQuantity: item.quantity,
        availableStock: product.stock,
        active: product.active,
      };
    });
    assertStockAvailable(stockItems);

    // Total calculado en el servidor
    const totals = calculateOrderTotals(
      cart.items.map((item) => {
        const product = productById.get(item.productId)!;
        return {
          productId: product.id,
          productName: product.name,
          unitPriceCents: product.priceCents,
          quantity: item.quantity,
        };
      }),
    );

    const order = await tx.order.create({
      data: {
        userId,
        status: "PENDING",
        totalCents: totals.totalCents,
        shipName: shipping.shipName,
        shipAddress: shipping.shipAddress,
        shipPhone: shipping.shipPhone,
        items: {
          create: totals.lines.map((line) => ({
            productId: line.productId,
            productName: line.productName,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
            subtotalCents: line.subtotalCents,
          })),
        },
      },
      include: { items: true },
    });

    // Descuento de stock atomico: la condicion stock >= quantity evita
    // que quede negativo incluso ante compras concurrentes.
    for (const item of cart.items) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        const product = productById.get(item.productId);
        throw new StockError(
          `Stock insuficiente para "${product?.name ?? item.productId}".`,
          item.productId,
        );
      }
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  });
}

/**
 * Cambia el estado de un pedido validando la transicion.
 * Si el pedido pasa a CANCELLED se restituye el stock.
 */
export async function changeOrderStatus(orderId: string, next: OrderStatus) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new ValidationError("El pedido no existe.");

    if (!canTransition(order.status, next)) {
      throw new ValidationError(
        `No se puede cambiar el estado de ${order.status} a ${next}.`,
      );
    }

    if (next === "CANCELLED") {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: next },
      include: { items: true },
    });
  });
}

export async function getSalesSummary() {
  const paidStatuses: OrderStatus[] = [
    "CONFIRMED",
    "PREPARING",
    "SHIPPED",
    "DELIVERED",
  ];

  const [totalOrders, pendingOrders, revenue, customers, products, lowStock] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.aggregate({
        _sum: { totalCents: true },
        where: { status: { in: paidStatuses } },
      }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count(),
      prisma.product.count({ where: { active: true, stock: { lte: 5 } } }),
    ]);

  const byStatusRaw = await prisma.order.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const byStatus = byStatusRaw.map((r) => ({
    status: r.status,
    count: r._count._all,
  }));

  return {
    totalOrders,
    pendingOrders,
    revenueCents: revenue._sum.totalCents ?? 0,
    customers,
    products,
    lowStock,
    byStatus,
  };
}

export async function getTopProducts(limit = 5) {
  const grouped = await prisma.orderItem.groupBy({
    by: ["productId", "productName"],
    _sum: { quantity: true, subtotalCents: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  return grouped.map((g) => ({
    productId: g.productId,
    productName: g.productName,
    unitsSold: g._sum.quantity ?? 0,
    revenueCents: g._sum.subtotalCents ?? 0,
  }));
}
