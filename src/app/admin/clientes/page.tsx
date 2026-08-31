import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminClientesPage() {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: {
      orders: { select: { totalCents: true, status: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-400">
              <th className="p-3">Nombre</th>
              <th className="p-3">Correo</th>
              <th className="p-3">Telefono</th>
              <th className="p-3 text-right">Pedidos</th>
              <th className="p-3 text-right">Total comprado</th>
              <th className="p-3">Registro</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const spent = c.orders
                .filter((o) => o.status !== "CANCELLED")
                .reduce((acc, o) => acc + o.totalCents, 0);
              return (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="p-3 font-medium text-slate-900">{c.name}</td>
                  <td className="p-3 text-slate-600">{c.email}</td>
                  <td className="p-3 text-slate-600">{c.phone ?? "-"}</td>
                  <td className="p-3 text-right">{c.orders.length}</td>
                  <td className="p-3 text-right">{formatCents(spent)}</td>
                  <td className="p-3 text-slate-500">
                    {c.createdAt.toLocaleDateString("es-PE")}
                  </td>
                </tr>
              );
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-400">
                  No hay clientes registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
