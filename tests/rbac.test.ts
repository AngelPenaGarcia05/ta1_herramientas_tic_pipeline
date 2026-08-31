import { describe, it, expect } from "vitest";
import { isAdmin, canAccessAdminPanel, canManageOrder } from "@/lib/rbac";

const customer = { userId: "u1", role: "CUSTOMER" as const };
const admin = { userId: "a1", role: "ADMIN" as const };

describe("roles y acceso", () => {
  it("un cliente NO puede acceder al panel administrativo", () => {
    expect(canAccessAdminPanel(customer)).toBe(false);
    expect(isAdmin(customer)).toBe(false);
  });

  it("un administrador SI puede acceder al panel administrativo", () => {
    expect(canAccessAdminPanel(admin)).toBe(true);
    expect(isAdmin(admin)).toBe(true);
  });

  it("una sesion nula no tiene acceso", () => {
    expect(canAccessAdminPanel(null)).toBe(false);
    expect(canAccessAdminPanel(undefined)).toBe(false);
  });
});

describe("canManageOrder", () => {
  it("el dueño del pedido puede verlo", () => {
    expect(canManageOrder(customer, "u1")).toBe(true);
  });

  it("otro cliente NO puede ver un pedido ajeno", () => {
    expect(canManageOrder(customer, "otro-user")).toBe(false);
  });

  it("un administrador puede gestionar cualquier pedido", () => {
    expect(canManageOrder(admin, "cualquiera")).toBe(true);
  });

  it("sin sesion no se puede gestionar", () => {
    expect(canManageOrder(null, "u1")).toBe(false);
  });
});
