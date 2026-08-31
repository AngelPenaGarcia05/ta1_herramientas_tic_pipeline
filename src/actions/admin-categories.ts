"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { categorySchema } from "@/lib/validations";
import { slugify } from "@/lib/catalog";
import { type ActionState, zodToFieldErrors } from "@/actions/types";

export async function createCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const slug = slugify(parsed.data.name) || "categoria";
  const clash = await prisma.category.findFirst({
    where: { OR: [{ name: parsed.data.name }, { slug }] },
  });
  if (clash) {
    return { ok: false, fieldErrors: { name: ["Ya existe una categoria con ese nombre"] } };
  }

  await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description ? parsed.data.description : null,
    },
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/catalogo");
  redirect("/admin/categorias");
}

export async function updateCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { ok: false, message: "Categoria no encontrada." };

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const slug = slugify(parsed.data.name) || "categoria";
  const clash = await prisma.category.findFirst({
    where: {
      OR: [{ name: parsed.data.name }, { slug }],
      NOT: { id },
    },
  });
  if (clash) {
    return { ok: false, fieldErrors: { name: ["Ya existe una categoria con ese nombre"] } };
  }

  await prisma.category.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description ? parsed.data.description : null,
    },
  });

  revalidatePath("/admin/categorias");
  revalidatePath("/catalogo");
  redirect("/admin/categorias");
}

export async function deleteCategoryAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    return {
      ok: false,
      message: `No se puede eliminar: la categoria tiene ${count} producto(s).`,
    };
  }
  await prisma.category.delete({ where: { id } });
  revalidatePath("/admin/categorias");
  return { ok: true, message: "Categoria eliminada." };
}
