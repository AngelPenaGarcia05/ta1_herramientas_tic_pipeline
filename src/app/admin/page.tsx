import Link from "next/link";
import { getSalesSummary, getTopProducts } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import StatusBadge, { statusLabel } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [summary, topProducts, recentOrders] = await Promise.all([
    getSalesSummary(),
    getTopProducts(5),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { user: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ingresos" value={formatCents(summary.revenueCents)} />
        <Stat label="Pedidos" value={summary.totalOrders} />
        <Stat label="Pendientes" value={summary.pendingOrders} />
        <Stat label="Clientes" value={summary.customers} />
        <Stat label="Productos" value={summary.products} />
        <Stat label="Stock bajo (<=5)" value={summary.lowStock} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Pedidos por estado</h2>
          <ul className="space-y-2 text-sm">
            {summary.byStatus.length === 0 && (
              <li className="text-slate-400">Sin datos</li>
            )}
            {summary.byStatus.map((s) => (
              <li key={s.status} className="flex items-center justify-between">
                <span>{statusLabel(s.status)}</span>
                <span className="font-semibold">{s.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">
            Productos mas vendidos
          </h2>
          <ul className="space-y-2 text-sm">
            {topProducts.length === 0 && (
              <li className="text-slate-400">Aun no hay ventas</li>
            )}
            {topProducts.map((p) => (
              <li
                key={p.productId}
                className="flex items-center justify-between"
              >
                <span className="truncate">{p.productName}</span>
                <span className="ml-2 shrink-0 text-slate-500">
                  {p.unitsSold} uds &middot; {formatCents(p.revenueCents)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Pedidos recientes</h2>
          <Link href="/admin/pedidos" className="text-sm text-brand-700 hover:underline">
            Ver todos
          </Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-2">Pedido</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="py-2">
                  <Link
                    href={`/admin/pedidos/${o.id}`}
                    className="font-mono text-xs text-brand-700 hover:underline"
                  >
                    #{o.id.slice(-8).toUpperCase()}
                  </Link>
                </td>
                <td>{o.user.name}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="text-right font-medium">
                  {formatCents(o.totalCents)}
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-400">
                  Sin pedidos
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
