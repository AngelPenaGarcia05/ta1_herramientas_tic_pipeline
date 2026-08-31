import { notFound } from "next/navigation";
import Link from "next/link";
import { getActiveProductBySlug } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import AddToCartForm from "@/components/AddToCartForm";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getActiveProductBySlug(slug);
  if (!product) notFound();

  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <Link href="/catalogo" className="text-sm text-brand-700 hover:underline">
        &larr; Volver al catalogo
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              product.imageUrl ||
              `https://picsum.photos/seed/${product.slug}/700/700`
            }
            alt={product.name}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="space-y-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {product.category.name}
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-2xl font-semibold text-brand-700">
            {formatCents(product.priceCents)}
          </p>
          <p className="whitespace-pre-line text-slate-600">
            {product.description}
          </p>
          <p className="text-sm text-slate-500">
            {product.stock > 0
              ? `${product.stock} unidades disponibles`
              : "Sin stock"}
          </p>

          <div className="pt-2">
            <AddToCartForm
              productId={product.id}
              maxStock={product.stock}
              isAuthenticated={Boolean(user && user.role === "CUSTOMER")}
            />
            {user?.role === "ADMIN" && (
              <p className="mt-2 text-xs text-slate-400">
                (Como administrador no puedes comprar; usa una cuenta de cliente.)
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
