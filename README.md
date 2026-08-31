# NovaMarket

Plataforma de comercio electronico (tienda en linea) construida como aplicacion
**full-stack con Next.js**. Incluye catalogo publico, carrito, checkout con
validacion de stock y totales en el servidor, area de cliente y un panel de
administracion protegido por rol.

El repositorio incluye ademas un **pipeline DevOps completo** (Docker, GitHub
Actions CI/CD, SonarCloud, Terraform + Render, Prometheus + Grafana). Ver la
seccion **[Arquitectura DevOps](#arquitectura-devops)** al final de este documento.

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
- **DevOps**: Docker + docker-compose, GitHub Actions (CI/CD), SonarCloud
  (calidad), Terraform + Render (infraestructura), Prometheus + Grafana +
  `prom-client` (monitoreo). Ver la seccion **Arquitectura DevOps** al final.

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
npm run test:coverage # con cobertura -> coverage/lcov.info (lo usa SonarCloud)
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
    metrics.ts           Registro Prometheus (prom-client)
    observe.ts           Helpers de instrumentacion (rutas y operaciones de negocio)
  instrumentation.ts     Hook de arranque de Next: inicia las metricas
  app/metrics/route.ts   GET /metrics  (formato Prometheus)
  app/api/health/route.ts GET /api/health  (healthcheck)
  middleware.ts          Proteccion de rutas /admin y area de cliente

# --- DevOps (ver seccion "Arquitectura DevOps") ---
Dockerfile               Imagen de produccion multi-stage
docker-entrypoint.sh     Arranque en produccion: migrate deploy + next start
docker-compose.yml       App + PostgreSQL en local
db/schema.sql            DDL generado desde Prisma
sonar-project.properties Config de SonarCloud
.github/workflows/ci-cd.yml  Pipeline (test+calidad -> build+push -> deploy)
infra/                   Terraform (Render: Postgres + Web Service)
monitoring/              Prometheus + Grafana (PoC local)
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

- Nunca se guardan credenciales reales en el codigo: todo va por variables de
  entorno y `.env` esta en `.gitignore`.

---

# Arquitectura DevOps

Esta seccion describe todo lo que rodea a la aplicacion para convertirla en un
pipeline CI/CD completo, **100% en capa gratuita** (GitHub Actions, Docker Hub,
SonarCloud, Render). La aplicacion en si no cambia salvo dos anadidos minimos:
el endpoint `/metrics` (monitoreo) y el endpoint `/api/health` (healthcheck).

## Piezas anadidas

| Pieza | Archivo(s) | Para que sirve |
|-------|-----------|----------------|
| Contenedor de la app | `Dockerfile`, `docker-entrypoint.sh`, `.dockerignore` | Imagen de produccion multi-stage: `node:20-alpine` + build **standalone** de Next.js (solo lo necesario, sin dev deps) + CLI de Prisma para aplicar migraciones al arrancar (~600 MB) |
| Entorno local completo | `docker-compose.yml` | App + PostgreSQL en local, esquema aplicado desde `db/schema.sql` |
| Esquema SQL | `db/schema.sql` | DDL generado desde Prisma; lo carga Postgres al iniciar |
| Calidad de codigo | `sonar-project.properties` | Config de SonarCloud (analiza `src/` y `tests/`, lee cobertura LCOV) |
| Pipeline CI/CD | `.github/workflows/ci-cd.yml` | 3 jobs encadenados: test+calidad -> build+push -> deploy |
| Infraestructura | `infra/*.tf` | Terraform con el provider oficial de Render (Postgres + Web Service) |
| Monitoreo (PoC local) | `monitoring/` | Prometheus + Grafana sobre la misma imagen de la app |
| Metricas en la app | `src/lib/metrics.ts`, `src/lib/observe.ts`, `src/instrumentation.ts`, `src/app/metrics/route.ts` | Endpoint `/metrics` en formato Prometheus |

## Flujo completo del pipeline

```
                          push a rama main
                                 |
                                 v
        +-------------------------------------------------+
        | JOB (a)  test-and-quality        [GitHub Actions]|
        |  - npm ci                                        |
        |  - npm run lint                                  |
        |  - npm run test:coverage   (Vitest -> lcov.info) |
        |  - Analisis SonarCloud     (usa SONAR_TOKEN)     |
        +-------------------------------------------------+
                                 | needs: (a) OK
                                 v
        +-------------------------------------------------+
        | JOB (b)  build-and-push          [GitHub Actions]|
        |  - docker login  (DOCKERHUB_USERNAME/TOKEN)      |
        |  - docker build -f Dockerfile                    |
        |  - docker push  usuario/novamarket:latest        |
        |  - docker push  usuario/novamarket:<git-sha>     |
        +-------------------------------------------------+
                                 | needs: (b) OK
                                 v
        +-------------------------------------------------+
        | JOB (c)  deploy-infra            [GitHub Actions]|
        |  - terraform init                               |
        |  - terraform apply -auto-approve                |
        |      * render_postgres    (plan free)          |
        |      * render_web_service (imagen de Docker Hub)|
        |      * inyecta DATABASE_URL en el web service    |
        +-------------------------------------------------+
                                 |
                                 v
                Render descarga la imagen y la publica en
                https://novamarket.onrender.com
```

## Que pasa paso a paso cuando haces `git push` a `main`

1. GitHub detecta el push y lanza el workflow `CI/CD NovaMarket`.
2. **Job (a) test-and-quality**: instala dependencias, corre el linter, corre las
   pruebas con cobertura (`vitest run --coverage`, genera `coverage/lcov.info`) y
   envia el analisis a SonarCloud.
3. Si (a) termina OK, arranca **Job (b) build-and-push**: hace login en Docker Hub,
   construye la imagen con el `Dockerfile` y la publica con dos etiquetas:
   `latest` y el SHA exacto del commit (para poder volver a una version concreta).
4. Si (b) termina OK, arranca **Job (c) deploy-infra**: ejecuta
   `terraform init` + `terraform apply`. Terraform habla con la API de Render y
   crea/actualiza:
   - una base de datos PostgreSQL (plan free),
   - un web service que corre la imagen recien publicada en Docker Hub,
   - con `DATABASE_URL` apuntando a la connection string interna de esa base.
5. Render descarga la imagen, ejecuta `docker-entrypoint.sh`
   (`prisma migrate deploy` -> `next start`) y expone la app en su URL publica.

## Que ocurre si una prueba falla (fail-fast)

Los 3 jobs estan encadenados con `needs:` en el workflow:

```yaml
build-and-push:   { needs: test-and-quality }
deploy-infra:     { needs: build-and-push }
```

- Si **una prueba de Vitest falla**, el comando `npm run test:coverage` devuelve
  codigo de salida != 0 -> el step falla -> el **job (a) falla**.
- GitHub Actions marca como **skipped** los jobs (b) y (c) porque su `needs` no se
  cumplio. **No se construye ninguna imagen y no se despliega nada.**
- El pipeline aparece en rojo en GitHub y (si esta configurado) llega un correo.
- Lo mismo aplica si falla el lint, si SonarCloud encuentra un *quality gate*
  reprobado, o si `terraform apply` falla: el proceso se detiene en ese punto y
  los pasos siguientes no se ejecutan. No hay logica manual: es el comportamiento
  por defecto de `needs`.

## Cuentas y credenciales que debes crear TU manualmente

El pipeline NO funcionara hasta que crees estas cuentas (todas gratuitas, sin
tarjeta) y cargues sus credenciales como **GitHub Secrets**. Este proyecto solo
deja *placeholders*; no genera ningun valor real.

| # | Cuenta | Donde | Que obtienes | Secret de GitHub |
|---|--------|-------|--------------|------------------|
| 1 | **GitHub** | github.com | El repo con Actions activado (gratis) | — |
| 2 | **Docker Hub** | hub.docker.com | Usuario + un *Access Token* (Account Settings -> Personal access tokens -> Generate) | `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` |
| 3 | **SonarCloud** | sonarcloud.io (login con GitHub) | Crear organizacion + proyecto "NovaMarket" (analisis manual). Copiar `Project Key` y `Organization` a `sonar-project.properties`. Generar un token en *My Account -> Security* | `SONAR_TOKEN` |
| 4 | **Render** | render.com (login con GitHub) | Una *API Key* en *Account Settings -> API Keys*. El *Owner ID* (empieza con `usr-` o `tea-`); se ve en la URL del dashboard o con `curl -H "Authorization: Bearer <API_KEY>" https://api.render.com/v1/owners` | `RENDER_API_KEY`, `RENDER_OWNER_ID` |

> Nota: en `sonar-project.properties` debes reemplazar `sonar.projectKey` y
> `sonar.organization` por los valores reales de tu proyecto de SonarCloud.

## Donde y como cargar los GitHub Secrets

En tu repositorio de GitHub:

1. **Settings** (del repo) -> menu lateral **Secrets and variables** -> **Actions**.
2. Boton **New repository secret**. Crea uno por cada fila:

   | Name | Value |
   |------|-------|
   | `DOCKERHUB_USERNAME` | tu usuario de Docker Hub |
   | `DOCKERHUB_TOKEN` | el access token de Docker Hub |
   | `SONAR_TOKEN` | el token de SonarCloud |
   | `RENDER_API_KEY` | la API key de Render |
   | `RENDER_OWNER_ID` | tu owner id de Render (`usr-...` o `tea-...`) |

3. No hace falta cargar nada mas: el workflow lee estos secrets con
   `${{ secrets.NOMBRE }}` y los pasa a Terraform como variables `TF_VAR_*`.

## Como probar TODO en local antes de hacer push

### 1. Pruebas, lint y cobertura

```bash
npm ci
npm run lint
npm run test:coverage      # genera coverage/lcov.info
```

### 2. La imagen Docker y el entorno completo (app + PostgreSQL)

```bash
# Genera db/schema.sql desde el schema de Prisma (si lo cambiaste)
npm run db:schema:sql

# Levanta app + base de datos
docker compose up --build

# En otra terminal, comprueba:
curl http://localhost:3000/api/health      # {"status":"ok",...}
curl http://localhost:3000/metrics         # metricas Prometheus
# App:  http://localhost:3000

# (opcional) cargar datos de ejemplo desde el host contra la base del compose:
DATABASE_URL="postgresql://novamarket:novamarket@localhost:5433/novamarket?schema=public" npm run db:seed

docker compose down            # apagar
docker compose down -v         # apagar y borrar la base
```

### 3. El stack de monitoreo (Prometheus + Grafana)

```bash
docker compose -f monitoring/docker-compose.monitoring.yml up --build

#  App         -> http://localhost:3000
#  Prometheus  -> http://localhost:9090   (Status -> Targets: "novamarket-app" UP)
#  Grafana     -> http://localhost:3001   (admin / admin)
#                 dashboard "NovaMarket - App" ya provisionado
```

Genera trafico (navega el catalogo, inicia sesion, agrega al carrito) y observa
subir `nova_http_requests_total` y `nova_business_operations_total`.

### 4. La infraestructura Terraform (solo validar, sin desplegar)

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # y completa tus valores

terraform init
terraform validate
terraform plan        # muestra que recursos se crearian en Render
```

> `terraform plan` NO crea nada; solo lo hace `terraform apply` (que ejecuta el
> pipeline). Si no tienes Terraform instalado puedes usar la imagen oficial:
> `docker run --rm -v "$PWD:/w" -w /w hashicorp/terraform:1.9 init` (y `plan`).

## Monitoreo: local vs produccion

- **Local (PoC)**: el stack `monitoring/` levanta Prometheus + Grafana que hacen
  scraping del endpoint `/metrics` de la app (metricas del proceso Node:
  memoria, CPU, event loop, GC; contadores HTTP de los route handlers; y
  contadores de negocio: registros, logins, items al carrito, pedidos).
- **Produccion (Render)**: NO se despliega Prometheus/Grafana (consumiria los
  recursos del plan free). El monitoreo de la app ya desplegada se hace con las
  **metricas nativas gratuitas del dashboard de Render**: CPU, memoria, numero de
  requests, tiempos de respuesta y logs en vivo, sin configuracion adicional.

## Limitaciones de la capa gratuita (a tener en cuenta)

- **Render web service (free)**: se duerme tras ~15 min sin trafico; la primera
  peticion despues tarda ~30 s en responder (cold start).
- **Render PostgreSQL (free)**: 1 GB, **una sola** por cuenta y **expira a los
  30 dias**. Si ya tienes una, borra la anterior antes del `terraform apply`.
- **`plan = "free"` del web service**: el provider de Render lo acepta aunque su
  documentacion liste solo planes de pago. Si una version futura lo rechazara,
  se cambia por el plan mas barato en `infra/main.tf`.
- **Estado de Terraform**: en este PoC se guarda en la cache de GitHub Actions.
  Si se borra la cache, el siguiente `apply` intentara **crear** recursos que ya
  existen y fallara; la solucion real es un backend remoto (Terraform Cloud es
  gratis).
- **SonarCloud**: el analisis solo corre si configuras `projectKey`/`organization`
  reales en `sonar-project.properties` y el secret `SONAR_TOKEN`.

## Resumen para la sustentacion (5 min)

1. **Problema**: integracion, pruebas y despliegue manuales; ambientes
   inconsistentes; nada detiene el proceso si una prueba falla.
2. **Solucion**: un push a `main` dispara un pipeline de 3 etapas encadenadas.
3. **Contenedores**: `Dockerfile` multi-stage -> imagen identica en local y en
   Render (adios "en mi maquina si funciona").
4. **Fail-fast**: `needs:` entre jobs -> si las pruebas fallan, no se construye
   imagen ni se despliega.
5. **IaC**: Terraform describe la infraestructura de Render en codigo y la
   recrea igual siempre.
6. **Monitoreo**: `/metrics` + Prometheus/Grafana en local; metricas nativas de
   Render en produccion.
