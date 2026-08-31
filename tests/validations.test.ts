import { describe, it, expect } from "vitest";
import {
  registerSchema,
  productSchema,
  checkoutSchema,
  productFilterSchema,
} from "@/lib/validations";

describe("registerSchema", () => {
  it("acepta datos validos", () => {
    const r = registerSchema.safeParse({
      name: "Ana Torres",
      email: "ANA@example.com",
      password: "secret123",
      confirmPassword: "secret123",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ana@example.com");
  });

  it("rechaza contrasenas que no coinciden", () => {
    const r = registerSchema.safeParse({
      name: "Ana",
      email: "ana@example.com",
      password: "secret123",
      confirmPassword: "otra12345",
    });
    expect(r.success).toBe(false);
  });

  it("rechaza contrasenas cortas", () => {
    const r = registerSchema.safeParse({
      name: "Ana",
      email: "ana@example.com",
      password: "123",
      confirmPassword: "123",
    });
    expect(r.success).toBe(false);
  });
});

describe("productSchema", () => {
  it("valida precio y stock en el servidor", () => {
    const ok = productSchema.safeParse({
      name: "Producto",
      description: "Una descripcion valida",
      price: "19.90",
      stock: "5",
      categoryId: "cat1",
    });
    expect(ok.success).toBe(true);

    const negStock = productSchema.safeParse({
      name: "Producto",
      description: "Una descripcion valida",
      price: "19.90",
      stock: "-1",
      categoryId: "cat1",
    });
    expect(negStock.success).toBe(false);

    const zeroPrice = productSchema.safeParse({
      name: "Producto",
      description: "Una descripcion valida",
      price: "0",
      stock: "5",
      categoryId: "cat1",
    });
    expect(zeroPrice.success).toBe(false);
  });
});

describe("productFilterSchema", () => {
  it("los campos vacios del formulario NO activan filtros", () => {
    const r = productFilterSchema.safeParse({
      q: "",
      category: "",
      sort: "",
      minPrice: "",
      maxPrice: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.q).toBeUndefined();
      expect(r.data.category).toBeUndefined();
      expect(r.data.minPrice).toBeUndefined();
      expect(r.data.maxPrice).toBeUndefined();
    }
  });

  it("parsea filtros validos", () => {
    const r = productFilterSchema.safeParse({
      q: "  laptop ",
      category: "laptops",
      sort: "price_asc",
      minPrice: "100",
      maxPrice: "2000",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.q).toBe("laptop");
      expect(r.data.category).toBe("laptops");
      expect(r.data.sort).toBe("price_asc");
      expect(r.data.minPrice).toBe(100);
      expect(r.data.maxPrice).toBe(2000);
    }
  });
});

describe("checkoutSchema", () => {
  it("exige datos de envio completos", () => {
    expect(
      checkoutSchema.safeParse({
        shipName: "Ana",
        shipAddress: "Calle 123 numero 45",
        shipPhone: "999888777",
      }).success,
    ).toBe(true);

    expect(
      checkoutSchema.safeParse({
        shipName: "",
        shipAddress: "",
        shipPhone: "",
      }).success,
    ).toBe(false);
  });
});
