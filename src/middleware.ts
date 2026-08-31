import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Middleware de proteccion de rutas.
 *  - /admin/*  -> requiere sesion con rol ADMIN
 *  - /carrito, /perfil, /pedidos -> requiere sesion (cualquier rol)
 */
const CUSTOMER_PROTECTED = ["/carrito", "/perfil", "/pedidos"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  const isAdminRoute = pathname.startsWith("/admin");
  const isCustomerRoute = CUSTOMER_PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!isAdminRoute && !isCustomerRoute) {
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminRoute && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/carrito/:path*", "/perfil/:path*", "/pedidos/:path*"],
};
