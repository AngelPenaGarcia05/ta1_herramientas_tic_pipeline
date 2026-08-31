import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { unitsToCents } from "@/lib/money";

export interface CatalogFilters {
  q?: string;
  category?: string; // slug
  sort?: "recent" | "price_asc" | "price_desc" | "name";
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  pageSize?: number;
}

/**
 * Devuelve unicamente productos ACTIVOS (regla de negocio: un producto
 * inactivo no debe aparecer en el catalogo).
 */
export async function getCatalog(filters: CatalogFilters) {
  const pageSize = filters.pageSize ?? 12;
  const page = Math.max(1, filters.page ?? 1);

  const where: Prisma.ProductWhereInput = { active: true };

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  if (filters.category) {
    where.category = { slug: filters.category };
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    where.priceCents = {};
    if (filters.minPrice != null)
      where.priceCents.gte = unitsToCents(filters.minPrice);
    if (filters.maxPrice != null)
      where.priceCents.lte = unitsToCents(filters.maxPrice);
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    filters.sort === "price_asc"
      ? { priceCents: "asc" }
      : filters.sort === "price_desc"
        ? { priceCents: "desc" }
        : filters.sort === "name"
          ? { name: "asc" }
          : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      include: { category: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getActiveProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, active: true },
    include: { category: true },
  });
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
