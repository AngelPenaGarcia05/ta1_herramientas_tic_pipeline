"use client";

import { useActionState } from "react";
import { loginAction } from "@/actions/auth";
import { initialActionState } from "@/actions/types";
import { SubmitButton, Alert, FieldError } from "@/components/ui";

export default function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      {state.message && <Alert kind="error">{state.message}</Alert>}

      <div>
        <label className="label" htmlFor="email">
          Correo
        </label>
        <input id="email" name="email" type="email" required className="input" />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Contrasena
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="input"
        />
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <SubmitButton pendingText="Ingresando...">Ingresar</SubmitButton>
    </form>
  );
}
