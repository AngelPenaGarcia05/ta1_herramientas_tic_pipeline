"use client";

import { useActionState } from "react";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatusAction } from "@/actions/admin-orders";
import { initialActionState } from "@/actions/types";
import { Alert } from "@/components/ui";

const ALL_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

export default function OrderStatusControl({
  orderId,
  current,
  allowed,
}: {
  orderId: string;
  current: OrderStatus;
  allowed: OrderStatus[];
}) {
  const [state, formAction] = useActionState(
    updateOrderStatusAction,
    initialActionState,
  );

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Este pedido esta en un estado final ({current}).
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <div className="flex items-center gap-2">
        <select name="status" defaultValue={allowed[0]} className="input w-56">
          {ALL_STATUSES.filter((s) => allowed.includes(s)).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-primary">
          Actualizar estado
        </button>
      </div>
      {state.message && (
        <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}
    </form>
  );
}
