"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { updateOrderStatusSchema } from "@/lib/validations";
import { changeOrderStatus } from "@/lib/orders";
import { ValidationError } from "@/lib/pricing";
import { type ActionState } from "@/actions/types";

export async function updateOrderStatusAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const parsed = updateOrderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Datos invalidos." };
  }

  try {
    await changeOrderStatus(parsed.data.orderId, parsed.data.status);
  } catch (e) {
    if (e instanceof ValidationError) {
      return { ok: false, message: e.message };
    }
    throw e;
  }

  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${parsed.data.orderId}`);
  revalidatePath("/admin");
  revalidatePath("/pedidos");
  return { ok: true, message: `Estado actualizado a ${parsed.data.status}.` };
}
