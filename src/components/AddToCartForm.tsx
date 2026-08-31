"use client";

import { useActionState } from "react";
import Link from "next/link";
import { addToCartAction } from "@/actions/cart";
import { initialActionState } from "@/actions/types";
import { SubmitButton, Alert } from "@/components/ui";

export default function AddToCartForm({
  productId,
  maxStock,
  isAuthenticated,
}: {
  productId: string;
  maxStock: number;
  isAuthenticated: boolean;
}) {
  const [state, formAction] = useActionState(addToCartAction, initialActionState);

  if (!isAuthenticated) {
    return (
      <Alert kind="info">
        <Link href="/login?callbackUrl=/carrito" className="font-medium underline">
          Inicia sesion
        </Link>{" "}
        para agregar productos al carrito.
      </Alert>
    );
  }

  if (maxStock <= 0) {
    return <Alert kind="error">Producto agotado.</Alert>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm font-medium text-slate-700">
          Cantidad
        </label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min={1}
          max={maxStock}
          defaultValue={1}
          className="input w-24"
        />
      </div>
      <SubmitButton pendingText="Agregando...">Agregar al carrito</SubmitButton>
      {state.message && (
        <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}
    </form>
  );
}
