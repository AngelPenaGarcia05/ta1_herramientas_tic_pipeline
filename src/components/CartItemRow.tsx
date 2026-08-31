"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateCartItemAction, removeCartItemAction } from "@/actions/cart";
import { initialActionState } from "@/actions/types";
import { formatCents } from "@/lib/money";

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  categoryName: string;
  unitPriceCents: number;
  quantity: number;
  maxQuantity: number;
  subtotalCents: number;
  issue: string | null;
}

export default function CartItemRow({ line }: { line: CartLine }) {
  const [updState, updAction] = useActionState(
    updateCartItemAction,
    initialActionState,
  );
  const [, removeAction] = useActionState(removeCartItemAction, initialActionState);

  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 sm:flex-row sm:items-center">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            line.imageUrl ||
            `https://picsum.photos/seed/${line.slug}/200/200`
          }
          alt={line.name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex-1">
        <Link
          href={`/productos/${line.slug}`}
          className="font-medium text-slate-900 hover:text-brand-700"
        >
          {line.name}
        </Link>
        <p className="text-xs text-slate-400">{line.categoryName}</p>
        <p className="text-sm text-slate-500">
          {formatCents(line.unitPriceCents)} c/u
        </p>
        {line.issue && (
          <p className="mt-1 text-xs font-medium text-red-600">{line.issue}</p>
        )}
        {updState.message && !updState.ok && (
          <p className="mt-1 text-xs font-medium text-red-600">
            {updState.message}
          </p>
        )}
      </div>

      <form action={updAction} className="flex items-center gap-2">
        <input type="hidden" name="productId" value={line.productId} />
        <input
          name="quantity"
          type="number"
          min={1}
          max={Math.max(line.maxQuantity, line.quantity)}
          defaultValue={line.quantity}
          className="input w-20"
        />
        <button type="submit" className="btn-secondary py-1.5">
          Actualizar
        </button>
      </form>

      <div className="w-28 text-right font-semibold text-slate-900">
        {formatCents(line.subtotalCents)}
      </div>

      <form action={removeAction}>
        <input type="hidden" name="productId" value={line.productId} />
        <button
          type="submit"
          className="text-sm text-red-600 hover:underline"
          aria-label={`Eliminar ${line.name}`}
        >
          Eliminar
        </button>
      </form>
    </div>
  );
}
