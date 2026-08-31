import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ORDER_STATUS_FLOW } from "@/lib/orders";
import { formatCents } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import OrderStatusControl from "@/components/admin/OrderStatusControl";

export const dynamic = "force-dynamic";

export default async function AdminPedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { user: true, items: true },
  });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link href="/admin/pedidos" className="text-sm text-brand-700 hover:underline">
        &larr; Pedidos
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Pedido #{order.id.slice(-8).toUpperCase()}
        </h1>
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-5 text-sm">
          <h2 className="mb-2 font-semibold text-slate-900">Cliente</h2>
          <p>{order.user.name}</p>
          <p className="text-slate-500">{order.user.email}</p>
          <h2 className="mb-2 mt-4 font-semibold text-slate-900">Envio</h2>
          <p>{order.shipName}</p>
          <p>{order.shipAddress}</p>
          <p>{order.shipPhone}</p>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Cambiar estado</h2>
          <OrderStatusControl
            orderId={order.id}
            current={order.status}
            allowed={ORDER_STATUS_FLOW[order.status]}
          />
          <p className="mt-3 text-xs text-slate-400">
            Al cancelar un pedido se restituye el stock de sus productos.
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Productos</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400">
              <th className="py-2">Producto</th>
              <th className="text-right">P. unitario</th>
              <th className="text-right">Cantidad</th>
              <th className="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="py-2">{item.productName}</td>
                <td className="py-2 text-right">
                  {formatCents(item.unitPriceCents)}
                </td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right font-medium">
                  {formatCents(item.subtotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 font-semibold">
              <td className="py-2" colSpan={3}>
                Total
              </td>
              <td className="py-2 text-right">{formatCents(order.totalCents)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
