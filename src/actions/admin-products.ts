"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { productSchema } from "@/lib/validations";
import { unitsToCents } from "@/lib/money";
import { slugify } from "@/lib/catalog";
import { type ActionState, zodToFieldErrors } from "@/actions/types";

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "producto";
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
    });
    if (!existing || existing.id === ignoreId) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    categoryId: formData.get("categoryId"),
    imageUrl: formData.get("imageUrl"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!category) {
    return { ok: false, fieldErrors: { categoryId: ["Categoria invalida"] } };
  }

  await prisma.product.create({
    data: {
      name: data.name,
      slug: await uniqueSlug(data.name),
      description: data.description,
      priceCents: unitsToCents(data.price),
      stock: data.stock,
      categoryId: data.categoryId,
      imageUrl: data.imageUrl ? data.imageUrl : null,
      active: data.active ?? true,
    },
  });

  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
  redirect("/admin/productos");
}

export async function updateProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, message: "Producto no encontrado." };

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    stock: formData.get("stock"),
    categoryId: formData.get("categoryId"),
    imageUrl: formData.get("imageUrl"),
    active: formData.get("active") === "on" || formData.get("active") === "true",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }
  const data = parsed.data;

  await prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      slug: await uniqueSlug(data.name, id),
      description: data.description,
      priceCents: unitsToCents(data.price),
      stock: data.stock,
      categoryId: data.categoryId,
      imageUrl: data.imageUrl ? data.imageUrl : null,
      active: data.active ?? true,
    },
  });

  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
  redirect("/admin/productos");
}

export async function toggleProductActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { ok: false, message: "Producto no encontrado." };

  await prisma.product.update({
    where: { id },
    data: { active: !product.active },
  });

  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
  return {
    ok: true,
    message: product.active ? "Producto desactivado." : "Producto activado.",
  };
}
