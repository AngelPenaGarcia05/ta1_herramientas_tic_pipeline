"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { checkoutSchema } from "@/lib/validations";
import { createOrderFromCart, CheckoutError } from "@/lib/orders";
import { StockError, ValidationError } from "@/lib/pricing";
import { type ActionState, zodToFieldErrors } from "@/actions/types";

export async function placeOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = checkoutSchema.safeParse({
    shipName: formData.get("shipName"),
    shipAddress: formData.get("shipAddress"),
    shipPhone: formData.get("shipPhone"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  let orderId: string;
  try {
    const order = await createOrderFromCart(user.id, parsed.data);
    orderId = order.id;
  } catch (e) {
    if (
      e instanceof CheckoutError ||
      e instanceof StockError ||
      e instanceof ValidationError
    ) {
      return { ok: false, message: e.message };
    }
    throw e;
  }

  revalidatePath("/carrito");
  revalidatePath("/pedidos");
  revalidatePath("/", "layout");
  redirect(`/pedidos/${orderId}?nuevo=1`);
}
