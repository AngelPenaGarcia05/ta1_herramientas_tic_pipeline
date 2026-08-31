"use client";

import { useActionState } from "react";
import { toggleProductActiveAction } from "@/actions/admin-products";
import { initialActionState } from "@/actions/types";

export default function ToggleActiveButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [, formAction] = useActionState(
    toggleProductActiveAction,
    initialActionState,
  );
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={`text-xs font-medium hover:underline ${
          active ? "text-amber-600" : "text-green-600"
        }`}
      >
        {active ? "Desactivar" : "Activar"}
      </button>
    </form>
  );
}
