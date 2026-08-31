"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/actions/profile";
import { initialActionState } from "@/actions/types";
import { SubmitButton, Alert, FieldError } from "@/components/ui";

export default function ProfileForm({
  defaultName,
  defaultPhone,
  defaultAddress,
}: {
  defaultName: string;
  defaultPhone: string;
  defaultAddress: string;
}) {
  const [state, formAction] = useActionState(
    updateProfileAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {state.message && (
        <Alert kind={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}

      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          defaultValue={defaultName}
          required
          className="input"
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>

      <div>
        <label className="label" htmlFor="phone">
          Telefono
        </label>
        <input
          id="phone"
          name="phone"
          defaultValue={defaultPhone}
          className="input"
        />
        <FieldError errors={state.fieldErrors?.phone} />
      </div>

      <div>
        <label className="label" htmlFor="address">
          Direccion
        </label>
        <input
          id="address"
          name="address"
          defaultValue={defaultAddress}
          className="input"
        />
        <FieldError errors={state.fieldErrors?.address} />
      </div>

      <SubmitButton pendingText="Guardando...">Guardar cambios</SubmitButton>
    </form>
  );
}
