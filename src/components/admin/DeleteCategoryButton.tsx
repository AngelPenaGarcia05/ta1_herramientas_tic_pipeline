"use client";

import { useActionState } from "react";
import { deleteCategoryAction } from "@/actions/admin-categories";
import { initialActionState } from "@/actions/types";

export default function DeleteCategoryButton({ id }: { id: string }) {
  const [state, formAction] = useActionState(
    deleteCategoryAction,
    initialActionState,
  );
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs font-medium text-red-600 hover:underline"
      >
        Eliminar
      </button>
      {state.message && !state.ok && (
        <span className="ml-2 text-xs text-red-600">{state.message}</span>
      )}
    </form>
  );
}
