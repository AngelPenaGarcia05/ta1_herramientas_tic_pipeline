import { prisma } from "@/lib/prisma";
import { calculateOrderTotals } from "@/lib/pricing";

export async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

/**
 * Devuelve el carrito del usuario con sus items y un resumen calculado
 * en el servidor. Marca lineas con problemas de stock / inactivas.
 */
export async function getCartView(userId: string) {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: { product: { include: { category: true } } },
        orderBy: { id: "asc" },
      },
    },
  });

  const rawItems = cart?.items ?? [];

  const lines = rawItems.map((item) => {
    const available = item.product.active ? item.product.stock : 0;
    const issue = !item.product.active
      ? "El producto ya no esta disponible"
      : item.quantity > item.product.stock
        ? `Solo quedan ${item.product.stock} unidades`
        : null;
    return {
      id: item.id,
      productId: item.productId,
      slug: item.product.slug,
      name: item.product.name,
      imageUrl: item.product.imageUrl,
      categoryName: item.product.category.name,
      unitPriceCents: item.product.priceCents,
      quantity: item.quantity,
      maxQuantity: available,
      subtotalCents: item.product.priceCents * item.quantity,
      issue,
    };
  });

  const purchasable = lines.filter((l) => !l.issue && l.quantity > 0);
  const totals =
    purchasable.length > 0
      ? calculateOrderTotals(
          purchasable.map((l) => ({
            productId: l.productId,
            productName: l.name,
            unitPriceCents: l.unitPriceCents,
            quantity: l.quantity,
          })),
        )
      : { lines: [], totalCents: 0, totalItems: 0 };

  return {
    cartId: cart?.id ?? null,
    lines,
    totalCents: totals.totalCents,
    totalItems: totals.totalItems,
    hasIssues: lines.some((l) => l.issue),
    isEmpty: lines.length === 0,
  };
}

export async function countCartItems(userId: string): Promise<number> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: { items: true },
  });
  return (cart?.items ?? []).reduce((acc, i) => acc + i.quantity, 0);
}
