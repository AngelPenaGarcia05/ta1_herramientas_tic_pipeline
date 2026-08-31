import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, categories] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { category: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-14">
      <section className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 px-8 py-16 text-white">
        <h1 className="max-w-2xl text-4xl font-bold sm:text-5xl">
          Todo lo que necesitas, en un solo lugar.
        </h1>
        <p className="mt-4 max-w-xl text-brand-100">
          NovaMarket es tu tienda en linea de tecnologia, hogar y mas. Compra
          rapido, seguro y con seguimiento de tus pedidos.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/catalogo" className="btn bg-white text-brand-700 hover:bg-brand-50">
            Ver catalogo
          </Link>
          <Link
            href="/registro"
            className="btn border border-white/50 text-white hover:bg-white/10"
          >
            Crear cuenta
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Categorias</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/catalogo?category=${c.slug}`}
                className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm text-slate-700 hover:border-brand-500 hover:text-brand-700"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Novedades</h2>
          <Link href="/catalogo" className="text-sm text-brand-700 hover:underline">
            Ver todo
          </Link>
        </div>
        {featured.length === 0 ? (
          <p className="text-slate-500">Aun no hay productos publicados.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
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
      </section>
    </div>
  );
}
