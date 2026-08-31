import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCatalog } from "@/lib/catalog";
import { productFilterSchema } from "@/lib/validations";
import ProductCard from "@/components/ProductCard";
import CatalogFilters from "@/components/CatalogFilters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const parsed = productFilterSchema.safeParse({
    q: sp.q,
    category: sp.category,
    sort: sp.sort,
    minPrice: sp.minPrice,
    maxPrice: sp.maxPrice,
  });
  const filters = parsed.success ? parsed.data : {};
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;

  const [categories, result] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    getCatalog({ ...filters, page }),
  ]);

  const buildQuery = (overrides: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { ...filters, page, ...overrides } as Record<string, unknown>;
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "" && v !== null) params.set(k, String(v));
    }
    return `/catalogo?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Catalogo</h1>

      <Suspense fallback={<div className="card h-40 p-4" />}>
        <CatalogFilters categories={categories} />
      </Suspense>

      <p className="text-sm text-slate-500">
        {result.total} producto(s) encontrado(s)
      </p>

      {result.items.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          No se encontraron productos con esos criterios.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.items.map((p) => (
            <ProductCard
              key={p.id}
              product={{
                slug: p.slug,
                name: p.name,
                priceCents: p.priceCents,
                stock: p.stock,
                imageUrl: p.imageUrl,
                categoryName: p.category.name,
              }}
            />
          ))}
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: result.totalPages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={buildQuery({ page: n })}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                n === result.page
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {n}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
