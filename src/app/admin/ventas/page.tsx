import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSalesSummary, getTopProducts } from "@/lib/orders";
import { formatCents } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const NON_CANCELLED: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
];

export default async function AdminVentasPage() {
  const [summary, top, orders] = await Promise.all([
    getSalesSummary(),
    getTopProducts(10),
    prisma.order.findMany({
      where: { status: { in: NON_CANCELLED } },
      orderBy: { createdAt: "desc" },
      include: { user: true },
    }),
  ]);

  const totalUnits = top.reduce((acc, p) => acc + p.unitsSold, 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Ventas</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-400">Ingresos confirmados</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCents(summary.revenueCents)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-400">Pedidos activos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {orders.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs uppercase text-slate-400">Unidades vendidas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalUnits}</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Ranking de productos</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-2">#</th>
              <th className="py-2">Producto</th>
              <th className="py-2 text-right">Unidades</th>
              <th className="py-2 text-right">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            {top.map((p, i) => (
              <tr key={p.productId} className="border-t border-slate-100">
                <td className="py-2 text-slate-400">{i + 1}</td>
                <td className="py-2">{p.productName}</td>
                <td className="py-2 text-right">{p.unitsSold}</td>
                <td className="py-2 text-right font-medium">
                  {formatCents(p.revenueCents)}
                </td>
              </tr>
            ))}
            {top.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  Aun no hay ventas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Detalle de ventas</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-2">Pedido</th>
              <th className="py-2">Cliente</th>
              <th className="py-2">Fecha</th>
              <th className="py-2">Estado</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="py-2 font-mono text-xs">
                  #{o.id.slice(-8).toUpperCase()}
                </td>
                <td className="py-2">{o.user.name}</td>
                <td className="py-2 text-slate-500">
                  {o.createdAt.toLocaleDateString("es-PE")}
                </td>
                <td className="py-2">
                  <StatusBadge status={o.status} />
                </td>
                <td className="py-2 text-right font-medium">
                  {formatCents(o.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
