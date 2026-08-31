import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import ToggleActiveButton from "@/components/admin/ToggleActiveButton";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Productos</h1>
        <Link href="/admin/productos/nuevo" className="btn-primary">
          Nuevo producto
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-400">
              <th className="p-3">Nombre</th>
              <th className="p-3">Categoria</th>
              <th className="p-3 text-right">Precio</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="p-3 font-medium text-slate-900">{p.name}</td>
                <td className="p-3 text-slate-600">{p.category.name}</td>
                <td className="p-3 text-right">{formatCents(p.priceCents)}</td>
                <td
                  className={`p-3 text-right ${
                    p.stock <= 5 ? "font-semibold text-red-600" : ""
                  }`}
                >
                  {p.stock}
                </td>
                <td className="p-3">
                  {p.active ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/productos/${p.id}`}
                      className="text-xs font-medium text-brand-700 hover:underline"
                    >
                      Editar
                    </Link>
                    <ToggleActiveButton id={p.id} active={p.active} />
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  No hay productos. Crea el primero.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
