import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageOrder } from "@/lib/rbac";
import { formatCents } from "@/lib/money";
import StatusBadge from "@/components/StatusBadge";
import { Alert } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PedidoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { nuevo } = await searchParams;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) notFound();
  if (!canManageOrder({ userId: user.id, role: user.role }, order.userId)) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/pedidos" className="text-sm text-brand-700 hover:underline">
        &larr; Mis pedidos
      </Link>

      {nuevo === "1" && (
        <Alert kind="success">
          Tu pedido fue registrado correctamente y esta pendiente de confirmacion.
        </Alert>
      )}

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Pedido #{order.id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-sm text-slate-500">
              {order.createdAt.toLocaleString("es-PE")}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="mt-6 divide-y divide-slate-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-3 text-sm">
              <span className="text-slate-700">
                {item.productName} &times; {item.quantity}
              </span>
              <span className="font-medium text-slate-900">
                {formatCents(item.subtotalCents)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-base font-semibold">
          <span>Total</span>
          <span>{formatCents(order.totalCents)}</span>
        </div>
      </div>

      <div className="card p-6 text-sm text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-900">Envio</h2>
        <p>{order.shipName}</p>
        <p>{order.shipAddress}</p>
        <p>{order.shipPhone}</p>
      </div>
    </div>
  );
}
