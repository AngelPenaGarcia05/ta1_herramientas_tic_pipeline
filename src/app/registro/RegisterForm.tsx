"use client";

import { useActionState } from "react";
import { registerAction } from "@/actions/auth";
import { initialActionState } from "@/actions/types";
import { SubmitButton, Alert, FieldError } from "@/components/ui";

export default function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialActionState);

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {state.message && <Alert kind="error">{state.message}</Alert>}

      <div>
        <label className="label" htmlFor="name">
          Nombre completo
        </label>
        <input id="name" name="name" required className="input" />
        <FieldError errors={state.fieldErrors?.name} />
      </div>

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
          minLength={8}
          className="input"
        />
        <FieldError errors={state.fieldErrors?.password} />
      </div>

      <div>
        <label className="label" htmlFor="confirmPassword">
          Confirmar contrasena
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          className="input"
        />
        <FieldError errors={state.fieldErrors?.confirmPassword} />
      </div>

      <SubmitButton pendingText="Creando cuenta...">Crear cuenta</SubmitButton>
    </form>
  );
}
