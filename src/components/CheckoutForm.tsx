"use client";

import { useActionState } from "react";
import { placeOrderAction } from "@/actions/checkout";
import { initialActionState } from "@/actions/types";
import { SubmitButton, Alert, FieldError } from "@/components/ui";

export default function CheckoutForm({
  defaultName,
  defaultAddress,
  defaultPhone,
  disabled,
}: {
  defaultName: string;
  defaultAddress: string;
  defaultPhone: string;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState(placeOrderAction, initialActionState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Datos de envio</h2>
      {state.message && <Alert kind="error">{state.message}</Alert>}

      <div>
        <label className="label" htmlFor="shipName">
          Nombre de quien recibe
        </label>
        <input
          id="shipName"
          name="shipName"
          defaultValue={defaultName}
          required
          className="input"
        />
        <FieldError errors={state.fieldErrors?.shipName} />
      </div>

      <div>
        <label className="label" htmlFor="shipAddress">
          Direccion
        </label>
        <input
          id="shipAddress"
          name="shipAddress"
          defaultValue={defaultAddress}
          required
          className="input"
        />
        <FieldError errors={state.fieldErrors?.shipAddress} />
      </div>

      <div>
        <label className="label" htmlFor="shipPhone">
          Telefono
        </label>
        <input
          id="shipPhone"
          name="shipPhone"
          defaultValue={defaultPhone}
          required
          className="input"
        />
        <FieldError errors={state.fieldErrors?.shipPhone} />
      </div>

      <SubmitButton pendingText="Confirmando pedido..." className="btn-primary w-full">
        {disabled ? "Revisa tu carrito" : "Confirmar pedido"}
      </SubmitButton>
      {disabled && (
        <p className="text-xs text-slate-500">
          Hay productos con problemas de stock o disponibilidad. Ajusta tu
          carrito antes de confirmar.
        </p>
      )}
    </form>
  );
}
