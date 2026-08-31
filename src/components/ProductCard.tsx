import Link from "next/link";
import { formatCents } from "@/lib/money";

export interface ProductCardData {
  slug: string;
  name: string;
  priceCents: number;
  stock: number;
  imageUrl: string | null;
  categoryName: string;
}

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/productos/${product.slug}`}
      className="card group overflow-hidden transition hover:shadow-md"
    >
      <div className="aspect-square w-full overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            product.imageUrl ||
            `https://picsum.photos/seed/${product.slug}/500/500`
          }
          alt={product.name}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
      </div>
      <div className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          {product.categoryName}
        </p>
        <h3 className="line-clamp-2 font-medium text-slate-900">{product.name}</h3>
        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-semibold text-brand-700">
            {formatCents(product.priceCents)}
          </span>
          {product.stock > 0 ? (
            <span className="text-xs text-slate-500">{product.stock} en stock</span>
          ) : (
            <span className="text-xs font-medium text-red-600">Agotado</span>
          )}
        </div>
      </div>
    </Link>
  );
}
