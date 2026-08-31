import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/catalogo");
  const { callbackUrl } = await searchParams;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Iniciar sesion</h1>
        <p className="text-sm text-slate-500">
          Ingresa a tu cuenta de NovaMarket.
        </p>
      </div>
      <LoginForm callbackUrl={callbackUrl ?? ""} />
      <p className="text-sm text-slate-600">
        No tienes cuenta?{" "}
        <Link href="/registro" className="font-medium text-brand-700 hover:underline">
          Registrate
        </Link>
      </p>
    </div>
  );
}
