import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  const user = await requireUser();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mis pedidos</h1>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Aun no has realizado pedidos.</p>
          <Link href="/catalogo" className="btn-primary mt-4">
            Ir al catalogo
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/pedidos/${order.id}`}
              className="card flex items-center justify-between p-4 hover:shadow-md"
            >
              <div>
                <p className="font-mono text-xs text-slate-400">
                  #{order.id.slice(-8).toUpperCase()}
                </p>
                <p className="text-sm text-slate-600">
                  {order.createdAt.toLocaleDateString("es-PE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  &middot; {order.items.length} producto(s)
                </p>
              </div>
              <div className="flex items-center gap-4">
                <StatusBadge status={order.status} />
                <span className="font-semibold text-slate-900">
                  {formatCents(order.totalCents)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
