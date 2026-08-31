import { prisma } from "@/lib/prisma";
import CategoryForm from "@/components/admin/CategoryForm";
import DeleteCategoryButton from "@/components/admin/DeleteCategoryButton";

export const dynamic = "force-dynamic";

export default async function AdminCategoriasPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Categorias</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-400">
                <th className="p-3">Nombre</th>
                <th className="p-3">Slug</th>
                <th className="p-3 text-right">Productos</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 align-top">
                  <td className="p-3">
                    <details>
                      <summary className="cursor-pointer font-medium text-slate-900">
                        {c.name}
                      </summary>
                      <div className="mt-2">
                        <CategoryForm
                          initial={{
                            id: c.id,
                            name: c.name,
                            description: c.description ?? "",
                          }}
                        />
                      </div>
                    </details>
                  </td>
                  <td className="p-3 font-mono text-xs text-slate-500">
                    {c.slug}
                  </td>
                  <td className="p-3 text-right">{c._count.products}</td>
                  <td className="p-3">
                    <DeleteCategoryButton id={c.id} />
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    No hay categorias.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="mb-2 font-semibold text-slate-900">Nueva categoria</h2>
          <CategoryForm />
        </div>
      </div>
    </div>
  );
}
