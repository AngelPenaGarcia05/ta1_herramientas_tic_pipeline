"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getOrCreateCart } from "@/lib/cart";
import { addToCartSchema, updateCartItemSchema } from "@/lib/validations";
import { assertStockAvailable } from "@/lib/pricing";
import { countBusinessOp } from "@/lib/observe";
import { type ActionState } from "@/actions/types";

export async function addToCartAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = addToCartSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity") ?? 1,
  });
  if (!parsed.success) {
    return { ok: false, message: "Datos invalidos." };
  }

  const { productId, quantity } = parsed.data;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) {
    return { ok: false, message: "El producto no esta disponible." };
  }

  const cart = await getOrCreateCart(user.id);
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });
  const newQty = (existing?.quantity ?? 0) + quantity;

  try {
    assertStockAvailable([
      {
        productId: product.id,
        productName: product.name,
        requestedQuantity: newQty,
        availableStock: product.stock,
        active: product.active,
      },
    ]);
  } catch (e) {
    countBusinessOp("cart_add", "rejected");
    return { ok: false, message: (e as Error).message };
  }

  await prisma.cartItem.upsert({
    where: { cartId_productId: { cartId: cart.id, productId } },
    create: { cartId: cart.id, productId, quantity },
    update: { quantity: newQty },
  });

  revalidatePath("/carrito");
  revalidatePath("/", "layout");
  countBusinessOp("cart_add", "success");
  return { ok: true, message: `"${product.name}" agregado al carrito.` };
}

export async function updateCartItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = updateCartItemSchema.safeParse({
    productId: formData.get("productId"),
    quantity: formData.get("quantity"),
  });
  if (!parsed.success) return { ok: false, message: "Datos invalidos." };

  const { productId, quantity } = parsed.data;
  const cart = await getOrCreateCart(user.id);

  if (quantity === 0) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
    revalidatePath("/carrito");
    revalidatePath("/", "layout");
    return { ok: true, message: "Producto eliminado del carrito." };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) {
    return { ok: false, message: "El producto no esta disponible." };
  }

  try {
    assertStockAvailable([
      {
        productId: product.id,
        productName: product.name,
        requestedQuantity: quantity,
        availableStock: product.stock,
        active: product.active,
      },
    ]);
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }

  await prisma.cartItem.updateMany({
    where: { cartId: cart.id, productId },
    data: { quantity },
  });

  revalidatePath("/carrito");
  revalidatePath("/", "layout");
  return { ok: true, message: "Carrito actualizado." };
}

export async function removeCartItemAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  const cart = await getOrCreateCart(user.id);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
  revalidatePath("/carrito");
  revalidatePath("/", "layout");
  return { ok: true, message: "Producto eliminado del carrito." };
}
