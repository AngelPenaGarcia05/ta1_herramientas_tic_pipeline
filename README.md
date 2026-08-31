# NovaMarket

Plataforma de comercio electronico (tienda en linea) construida como aplicacion
**full-stack con Next.js**. Incluye catalogo publico, carrito, checkout con
validacion de stock y totales en el servidor, area de cliente y un panel de
administracion protegido por rol.

> Esta es la **etapa 1**: el sistema base completamente funcional.
> La arquitectura DevOps / CI-CD se implementara despues sobre esta base.

---

## Descripcion del sistema

- **Clientes** pueden registrarse, iniciar sesion, explorar el catalogo, buscar y
  filtrar productos, ver el detalle de un producto, gestionar su carrito,
  confirmar pedidos, consultar el historial de sus pedidos y editar su perfil.
- **Administradores** disponen de un panel en `/admin` (protegido por rol) para
  gestionar productos y categorias, consultar clientes y pedidos, cambiar el
  estado de los pedidos, revisar las ventas y ver un dashboard con estadisticas.

### Reglas de negocio implementadas

| Regla | Donde |
|-------|-------|
| Precio y stock se validan en el servidor | `src/lib/pricing.ts`, Zod en `src/lib/validations.ts` |
| El stock nunca puede ser negativo | `decrementStock()` + `UPDATE ... WHERE stock >= qty` en `src/lib/orders.ts` |
| No se puede comprar mas unidades de las disponibles | `assertStockAvailable()` |
| Un producto inactivo no aparece en el catalogo | `getCatalog()` filtra `active: true` |
| Al crear un pedido se vuelve a validar el stock | `createOrderFromCart()` (dentro de una transaccion) |
| El total del pedido se calcula en el servidor | `calculateOrderTotals()` |
| Al confirmar la compra se actualiza el stock | transaccion en `createOrderFromCart()` |
| Un cliente no puede acceder al panel administrativo | `middleware.ts` + `requireAdmin()` |
| Un administrador si puede acceder al panel administrativo | `middleware.ts` + `requireAdmin()` |
| Al cancelar un pedido se restituye el stock | `changeOrderStatus()` |

---

## Tecnologias

- **Next.js 15** (App Router) — frontend + Route Handlers + Server Actions
- **TypeScript**
- **PostgreSQL**
- **Prisma ORM**
- **Zod** para validacion de entrada en el servidor
- **Autenticacion** propia basada en sesiones JWT (`jose`) en cookie httpOnly,
  hashing con `bcryptjs`, usuarios almacenados con Prisma y guardas de ruta con
  el middleware de Next.js
- **Tailwind CSS** para la interfaz
- **Vitest** para las pruebas

No hay backend separado: toda la logica vive dentro de Next.js.

---

## Requisitos

- **Node.js 20 o superior** (probado con Node 22)
- **npm 10+**
- **PostgreSQL 14+** en ejecucion y accesible (local, remoto o en un contenedor
  ya levantado). El proyecto solo necesita la cadena de conexion en `DATABASE_URL`.

---

## Instalacion

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de entorno
cp .env.example .env      # en Windows PowerShell: copy .env.example .env
```

Edita `.env` y define al menos:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/novamarket?schema=public"
AUTH_SECRET="<un-secreto-largo-y-aleatorio>"
```

Para generar un `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## Configuracion de PostgreSQL

1. Asegurate de tener un servidor PostgreSQL en ejecucion y accesible.
2. Crea una base de datos vacia para el proyecto:

   ```bash
   createdb -U postgres novamarket
   # o desde psql:  CREATE DATABASE novamarket;
   ```

3. Ajusta `DATABASE_URL` en `.env` con tu host, puerto, usuario y contrasena, por
   ejemplo:

   ```env
   DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/novamarket?schema=public"
   ```

> En el entorno de desarrollo usado para este proyecto, PostgreSQL corre en un
> contenedor ya levantado que expone el puerto `5432` (usuario `postgres`,
> base `novamarket`). Basta con apuntar `DATABASE_URL` a ese puerto.

---

## Migraciones Prisma

```bash
# Generar el cliente de Prisma (tambien se ejecuta en postinstall y build)
npm run prisma:generate

# Crear/aplicar migraciones en desarrollo
npm run prisma:migrate         # equivale a: prisma migrate dev

# Aplicar migraciones existentes (entornos ya creados)
npm run prisma:deploy          # equivale a: prisma migrate deploy
```

---

## Seed

Carga datos de ejemplo: **1 administrador, 3 clientes, 6 categorias,
12 productos (uno inactivo) y 3 pedidos de prueba**.

```bash
npm run db:seed
# o de forma equivalente:
npx prisma db seed
```

> El seed **borra** los datos existentes antes de insertar.

---

## Ejecucion

```bash
# Desarrollo (hot reload)
npm run dev            # http://localhost:3000

# Produccion
npm run build
npm run start
```

Puesta en marcha completa desde cero:

```bash
npm install
cp .env.example .env            # y edita DATABASE_URL / AUTH_SECRET
createdb -U postgres novamarket # crea la base (si aun no existe)
npm run prisma:migrate          # aplica las migraciones
npm run db:seed                 # carga datos de ejemplo
npm run dev
```

---

## Usuarios de prueba

| Rol | Correo | Contrasena |
|-----|--------|-----------|
| ADMIN | `admin@novamarket.com` | `Admin123` |
| CLIENTE | `ana@example.com` | `Password123` |
| CLIENTE | `bruno@example.com` | `Password123` |
| CLIENTE | `carla@example.com` | `Password123` |

---

## Ejecucion de pruebas

```bash
npm run test          # una sola corrida (Vitest)
npm run test:watch    # modo watch
```

Las pruebas cubren la logica critica **sin depender de la base de datos**:

- `tests/pricing.test.ts` — calculo de subtotales y totales, validacion de stock,
  el stock nunca queda negativo, productos inactivos no se pueden comprar.
- `tests/order-status.test.ts` — maquina de estados de los pedidos.
- `tests/rbac.test.ts` — un cliente no accede al panel admin, un admin si;
  propiedad de pedidos.
- `tests/validations.test.ts` — esquemas Zod de registro, producto y checkout.

### Comandos de calidad

```bash
npm run lint          # ESLint (next lint)
npm run test          # Vitest
npm run build         # Prisma generate + build de Next.js
```

---

## Estructura del proyecto

```
prisma/
  schema.prisma          Modelo de datos (User, Category, Product, Order, OrderItem, Cart, CartItem)
  seed.ts                Datos de ejemplo
  migrations/            Migraciones SQL
src/
  app/
    (publico)            /, /catalogo, /productos/[slug], /login, /registro
    carrito, perfil, pedidos     Area de cliente (protegida)
    admin/               Dashboard, productos, categorias, pedidos, clientes, ventas (rol ADMIN)
  actions/               Server Actions (auth, carrito, checkout, admin-*)
  components/            UI reutilizable
  lib/
    prisma.ts            Cliente Prisma (singleton)
    session.ts           Firma/verificacion de JWT (compatible con Edge/middleware)
    auth.ts              getCurrentUser / requireUser / requireAdmin
    pricing.ts           Logica pura de totales y stock (testeada)
    orders.ts            Creacion de pedidos y transiciones de estado
    catalog.ts           Consultas del catalogo
    cart.ts              Vista y resumen del carrito
    validations.ts       Esquemas Zod
    rbac.ts              Reglas de acceso por rol (testeadas)
  middleware.ts          Proteccion de rutas /admin y area de cliente
```

---

## Modelo de datos

```
Category 1 ── N Product
User     1 ── N Order
Order    1 ── N OrderItem
Product  1 ── N OrderItem
User     1 ── 1 Cart 1 ── N CartItem
```

- Roles: `CUSTOMER`, `ADMIN`.
- Estados de pedido: `PENDING`, `CONFIRMED`, `PREPARING`, `SHIPPED`, `DELIVERED`,
  `CANCELLED`.
- Los precios se guardan en **centavos** (enteros) para evitar errores de
  punto flotante; `OrderItem` guarda una copia del nombre y precio unitario al
  momento de la compra.

---

## Notas

- En esta etapa **no** se incluye configuracion de DevOps (GitHub Actions,
  Docker, Kubernetes, Terraform, etc.). Se agregara sobre este sistema en la
  siguiente etapa.
- Nunca se guardan credenciales reales en el codigo: todo va por variables de
  entorno y `.env` esta en `.gitignore`.
