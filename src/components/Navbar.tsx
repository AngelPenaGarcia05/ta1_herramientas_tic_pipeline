import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { countCartItems } from "@/lib/cart";
import { logoutAction } from "@/actions/auth";

export default async function Navbar() {
  const user = await getCurrentUser();
  const cartCount = user && user.role === "CUSTOMER" ? await countCartItems(user.id) : 0;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-brand-700">
            Nova<span className="text-slate-900">Market</span>
          </Link>
          <div className="hidden items-center gap-4 text-sm text-slate-600 sm:flex">
            <Link href="/catalogo" className="hover:text-brand-700">
              Catalogo
            </Link>
            {user?.role === "ADMIN" && (
              <Link href="/admin" className="font-medium hover:text-brand-700">
                Panel admin
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              {user.role === "CUSTOMER" && (
                <>
                  <Link href="/carrito" className="relative hover:text-brand-700">
                    Carrito
                    {cartCount > 0 && (
                      <span className="absolute -right-4 -top-2 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/pedidos" className="hover:text-brand-700">
                    Mis pedidos
                  </Link>
                </>
              )}
              <Link href="/perfil" className="hover:text-brand-700">
                {user.name.split(" ")[0]}
              </Link>
              <form action={logoutAction}>
                <button className="btn-secondary py-1.5" type="submit">
                  Salir
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-brand-700">
                Iniciar sesion
              </Link>
              <Link href="/registro" className="btn-primary py-1.5">
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
