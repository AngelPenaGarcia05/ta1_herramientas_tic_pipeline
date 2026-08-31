import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/catalogo");

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Crear cuenta</h1>
        <p className="text-sm text-slate-500">
          Registrate para comprar en NovaMarket.
        </p>
      </div>
      <RegisterForm />
      <p className="text-sm text-slate-600">
        Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Inicia sesion
        </Link>
      </p>
    </div>
  );
}
