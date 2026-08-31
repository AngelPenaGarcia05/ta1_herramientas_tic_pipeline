import { z } from "zod";

export const OrderStatusEnum = z.enum([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
    email: z.string().trim().toLowerCase().email("Correo invalido"),
    password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres").max(100),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Correo invalido"),
  password: z.string().min(1, "La contrasena es obligatoria"),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export const productSchema = z.object({
  name: z.string().trim().min(2, "El nombre es obligatorio").max(140),
  description: z.string().trim().min(5, "La descripcion es obligatoria").max(2000),
  // Precio en la moneda (ej. 19.90). Se convierte a centavos en el servidor.
  price: z.coerce
    .number({ invalid_type_error: "Precio invalido" })
    .positive("El precio debe ser mayor a 0")
    .max(1_000_000, "Precio demasiado alto"),
  stock: z.coerce
    .number({ invalid_type_error: "Stock invalido" })
    .int("El stock debe ser un entero")
    .min(0, "El stock no puede ser negativo")
    .max(1_000_000),
  categoryId: z.string().min(1, "Selecciona una categoria"),
  imageUrl: z.string().trim().url("URL de imagen invalida").optional().or(z.literal("")),
  active: z.coerce.boolean().optional().default(true),
});

export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(999),
});

export const updateCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(0).max(999),
});

export const checkoutSchema = z.object({
  shipName: z.string().trim().min(2, "Nombre de envio obligatorio").max(120),
  shipAddress: z.string().trim().min(5, "Direccion de envio obligatoria").max(255),
  shipPhone: z.string().trim().min(6, "Telefono de envio obligatorio").max(30),
});

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: OrderStatusEnum,
});

// Convierte "" / null / undefined en undefined para que un campo vacio del
// formulario no active un filtro (antes "" se convertia en 0 y ocultaba todo).
const emptyToUndefined = (v: unknown) =>
  v === "" || v === null || v === undefined ? undefined : v;

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalPositiveNumber = z.preprocess(
  emptyToUndefined,
  z.coerce.number().min(0).optional(),
);

export const productFilterSchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().trim().max(120).optional()),
  category: optionalString,
  sort: z.preprocess(
    emptyToUndefined,
    z.enum(["recent", "price_asc", "price_desc", "name"]).optional(),
  ),
  minPrice: optionalPositiveNumber,
  maxPrice: optionalPositiveNumber,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
