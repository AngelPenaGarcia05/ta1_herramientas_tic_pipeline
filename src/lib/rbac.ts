/**
 * Control de acceso basado en roles (RBAC) - logica pura y testeable.
 */
import type { Role } from "@prisma/client";

export interface SessionLike {
  userId: string;
  role: Role;
}

export function isAdmin(session: SessionLike | null | undefined): boolean {
  return session?.role === "ADMIN";
}

export function canAccessAdminPanel(
  session: SessionLike | null | undefined,
): boolean {
  return isAdmin(session);
}

export function canManageOrder(
  session: SessionLike | null | undefined,
  orderOwnerId: string,
): boolean {
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  return session.userId === orderOwnerId;
}
