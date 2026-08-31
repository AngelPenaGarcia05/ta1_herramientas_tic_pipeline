"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { startSession, endSession } from "@/lib/auth";
import { loginSchema, registerSchema } from "@/lib/validations";
import { countBusinessOp } from "@/lib/observe";
import { type ActionState, zodToFieldErrors } from "@/actions/types";

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: false,
      message: "Ya existe una cuenta con ese correo.",
      fieldErrors: { email: ["Correo en uso"] },
    };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hashPassword(password),
      role: "CUSTOMER",
    },
  });

  await startSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  countBusinessOp("register", "success");
  redirect("/catalogo");
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: zodToFieldErrors(parsed.error) };
  }

  const callbackUrl = String(formData.get("callbackUrl") || "");
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.password))) {
    countBusinessOp("login", "rejected");
    return { ok: false, message: "Correo o contrasena incorrectos." };
  }

  await startSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  countBusinessOp("login", "success");

  const safeCallback =
    callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : user.role === "ADMIN"
        ? "/admin"
        : "/catalogo";

  redirect(safeCallback);
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
