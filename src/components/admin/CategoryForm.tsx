"use client";

import { useActionState } from "react";
import {
  createCategoryAction,
  updateCategoryAction,
} from "@/actions/admin-categories";
import { initialActionState } from "@/actions/types";
import { SubmitButton, Alert, FieldError } from "@/components/ui";

export default function CategoryForm({
  initial,
}: {
  initial?: { id: string; name: string; description: string };
}) {
  const isEdit = Boolean(initial?.id);
  const [state, formAction] = useActionState(
    isEdit ? updateCategoryAction : createCategoryAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="card space-y-3 p-4">
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}
      {state.message && <Alert kind="error">{state.message}</Alert>}
      <div>
        <label className="label" htmlFor={`name-${initial?.id ?? "new"}`}>
          Nombre
        </label>
        <input
          id={`name-${initial?.id ?? "new"}`}
          name="name"
          defaultValue={initial?.name ?? ""}
          required
          className="input"
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <div>
        <label className="label" htmlFor={`desc-${initial?.id ?? "new"}`}>
          Descripcion (opcional)
        </label>
        <input
          id={`desc-${initial?.id ?? "new"}`}
          name="description"
          defaultValue={initial?.description ?? ""}
          className="input"
        />
      </div>
      <SubmitButton pendingText="Guardando...">
        {isEdit ? "Guardar" : "Crear categoria"}
      </SubmitButton>
    </form>
  );
}
