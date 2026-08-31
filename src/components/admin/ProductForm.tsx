"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createProductAction,
  updateProductAction,
} from "@/actions/admin-products";
import { initialActionState } from "@/actions/types";
import { SubmitButton, Alert, FieldError } from "@/components/ui";

export interface ProductFormValues {
  id?: string;
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
  imageUrl: string;
  active: boolean;
}

export default function ProductForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial?: ProductFormValues;
}) {
  const isEdit = Boolean(initial?.id);
  const [state, formAction] = useActionState(
    isEdit ? updateProductAction : createProductAction,
    initialActionState,
  );

  return (
    <form action={formAction} className="card space-y-4 p-6">
      {isEdit && <input type="hidden" name="id" value={initial!.id} />}
      {state.message && <Alert kind="error">{state.message}</Alert>}

      <div>
        <label className="label" htmlFor="name">
          Nombre
        </label>
        <input
          id="name"
          name="name"
          defaultValue={initial?.name ?? ""}
          required
          className="input"
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Descripcion
        </label>
        <textarea
          id="description"
          name="description"
          defaultValue={initial?.description ?? ""}
          required
          rows={4}
          className="input"
        />
        <FieldError errors={state.fieldErrors?.description} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="price">
            Precio (PEN)
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={initial?.price ?? ""}
            required
            className="input"
          />
          <FieldError errors={state.fieldErrors?.price} />
        </div>
        <div>
          <label className="label" htmlFor="stock">
            Stock
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min="0"
            step="1"
            defaultValue={initial?.stock ?? "0"}
            required
            className="input"
          />
          <FieldError errors={state.fieldErrors?.stock} />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="categoryId">
          Categoria
        </label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={initial?.categoryId ?? ""}
          required
          className="input"
        >
          <option value="">Selecciona...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors?.categoryId} />
      </div>

      <div>
        <label className="label" htmlFor="imageUrl">
          URL de imagen (opcional)
        </label>
        <input
          id="imageUrl"
          name="imageUrl"
          type="url"
          defaultValue={initial?.imageUrl ?? ""}
          className="input"
        />
        <FieldError errors={state.fieldErrors?.imageUrl} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="active"
          defaultChecked={initial?.active ?? true}
        />
        Producto activo (visible en el catalogo)
      </label>

      <div className="flex gap-2">
        <SubmitButton pendingText="Guardando...">
          {isEdit ? "Guardar cambios" : "Crear producto"}
        </SubmitButton>
        <Link href="/admin/productos" className="btn-secondary">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
