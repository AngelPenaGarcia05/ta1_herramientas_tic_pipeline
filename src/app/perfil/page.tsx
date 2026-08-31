import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const user = await requireUser();
  const fresh = await prisma.user.findUnique({ where: { id: user.id } });

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Mi perfil</h1>

      <div className="card p-4 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-900">Correo:</span>{" "}
          {user.email}
        </p>
        <p>
          <span className="font-medium text-slate-900">Rol:</span> {user.role}
        </p>
      </div>

      <ProfileForm
        defaultName={fresh?.name ?? ""}
        defaultPhone={fresh?.phone ?? ""}
        defaultAddress={fresh?.address ?? ""}
      />
    </div>
  );
}
