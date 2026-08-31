import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { centsToUnits } from "@/lib/money";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Editar producto</h1>
      <ProductForm
        categories={categories}
        initial={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: String(centsToUnits(product.priceCents)),
          stock: String(product.stock),
          categoryId: product.categoryId,
          imageUrl: product.imageUrl ?? "",
          active: product.active,
        }}
      />
    </div>
  );
}
