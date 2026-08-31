import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getCartView } from "@/lib/cart";
import { formatCents } from "@/lib/money";
import CartItemRow from "@/components/CartItemRow";
import CheckoutForm from "@/components/CheckoutForm";

export const dynamic = "force-dynamic";

export default async function CarritoPage() {
  const user = await requireUser();
  if (user.role === "ADMIN") {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-8 text-slate-600">
        El carrito solo esta disponible para cuentas de cliente.
      </p>
    );
  }

  const cart = await getCartView(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Tu carrito</h1>

      {cart.isEmpty ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">Tu carrito esta vacio.</p>
          <Link href="/catalogo" className="btn-primary mt-4">
            Explorar catalogo
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="card px-4">
              {cart.lines.map((line) => (
                <CartItemRow key={line.productId} line={line} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card space-y-2 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Resumen</h2>
              <div className="flex justify-between text-sm text-slate-600">
                <span>Articulos</span>
                <span>{cart.totalItems}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
                <span>Total</span>
                <span>{formatCents(cart.totalCents)}</span>
              </div>
              <p className="text-xs text-slate-400">
                El total se calcula en el servidor con los precios vigentes.
              </p>
            </div>

            <CheckoutForm
              defaultName={user.name}
              defaultAddress={user.address ?? ""}
              defaultPhone={user.phone ?? ""}
              disabled={cart.hasIssues || cart.totalCents === 0}
            />
          </div>
        </div>
      )}
    </div>
  );
}
