/**
 * Seed de NovaMarket.
 *  - 1 administrador
 *  - 3 clientes
 *  - 6 categorias
 *  - 12 productos
 *  - 3 pedidos de prueba (con descuento de stock coherente)
 *
 * Ejecucion: npm run db:seed   (o  prisma db seed)
 */
import { PrismaClient, type OrderStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("Limpiando datos previos...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123", 10);
  const adminHash = await bcrypt.hash("Admin123", 10);

  console.log("Creando usuarios...");
  const admin = await prisma.user.create({
    data: {
      name: "Administrador NovaMarket",
      email: "admin@novamarket.com",
      password: adminHash,
      role: "ADMIN",
      phone: "+51 999 000 111",
      address: "Av. Central 100, Lima",
    },
  });

  const customers = await Promise.all(
    [
      { name: "Ana Torres", email: "ana@example.com" },
      { name: "Bruno Diaz", email: "bruno@example.com" },
      { name: "Carla Mendoza", email: "carla@example.com" },
    ].map((c, i) =>
      prisma.user.create({
        data: {
          name: c.name,
          email: c.email,
          password: passwordHash,
          role: "CUSTOMER",
          phone: `+51 900 000 ${100 + i}`,
          address: `Calle ${i + 1}, Lima`,
        },
      }),
    ),
  );

  console.log("Creando categorias...");
  const categoryData = [
    { name: "Laptops", description: "Computadoras portatiles" },
    { name: "Smartphones", description: "Telefonos inteligentes" },
    { name: "Audio", description: "Audifonos y parlantes" },
    { name: "Accesorios", description: "Complementos y perifericos" },
    { name: "Hogar Inteligente", description: "Dispositivos para el hogar" },
    { name: "Gaming", description: "Consolas y accesorios gamer" },
  ];
  const categories = await Promise.all(
    categoryData.map((c) =>
      prisma.category.create({
        data: { name: c.name, slug: slugify(c.name), description: c.description },
      }),
    ),
  );
  const catBy = (name: string) => categories.find((c) => c.name === name)!;

  console.log("Creando productos...");
  const productData: Array<{
    name: string;
    description: string;
    price: number;
    stock: number;
    category: string;
    active?: boolean;
  }> = [
    {
      name: "Laptop NovaBook 14",
      description: "Ultraligera con pantalla 14 pulgadas, 16GB RAM y SSD 512GB.",
      price: 3299.9,
      stock: 12,
      category: "Laptops",
    },
    {
      name: "Laptop NovaBook Pro 16",
      description: "Potencia para creadores: 32GB RAM, SSD 1TB y GPU dedicada.",
      price: 5799.0,
      stock: 6,
      category: "Laptops",
    },
    {
      name: "Smartphone Nova X",
      description: "Camara triple de 50MP, bateria de 5000mAh y carga rapida.",
      price: 1899.9,
      stock: 20,
      category: "Smartphones",
    },
    {
      name: "Smartphone Nova Lite",
      description: "Gama media con gran autonomia y pantalla AMOLED de 6.5.",
      price: 999.9,
      stock: 30,
      category: "Smartphones",
    },
    {
      name: "Audifonos NovaSound ANC",
      description: "Cancelacion activa de ruido y 30h de reproduccion.",
      price: 449.9,
      stock: 25,
      category: "Audio",
    },
    {
      name: "Parlante NovaBoom",
      description: "Parlante bluetooth resistente al agua IPX7.",
      price: 279.9,
      stock: 18,
      category: "Audio",
    },
    {
      name: "Mouse inalambrico NovaClick",
      description: "Ergonomico, silencioso y con receptor USB-C.",
      price: 89.9,
      stock: 50,
      category: "Accesorios",
    },
    {
      name: "Teclado mecanico NovaType",
      description: "Switches rojos, retroiluminacion RGB y formato compacto.",
      price: 259.9,
      stock: 15,
      category: "Accesorios",
    },
    {
      name: "Foco inteligente NovaGlow",
      description: "Luz regulable y de colores, control por app y voz.",
      price: 59.9,
      stock: 40,
      category: "Hogar Inteligente",
    },
    {
      name: "Enchufe inteligente NovaPlug",
      description: "Programa y monitorea el consumo de tus aparatos.",
      price: 45.9,
      stock: 35,
      category: "Hogar Inteligente",
    },
    {
      name: "Consola NovaPlay 5",
      description: "Juegos en 4K, 1TB de almacenamiento y mando inalambrico.",
      price: 2599.0,
      stock: 8,
      category: "Gaming",
    },
    {
      name: "Silla gamer NovaThrone",
      description: "Reclinable, soporte lumbar y reposabrazos 4D. (Descontinuada)",
      price: 899.9,
      stock: 0,
      category: "Gaming",
      active: false,
    },
  ];

  const products = await Promise.all(
    productData.map((p, i) =>
      prisma.product.create({
        data: {
          name: p.name,
          slug: slugify(p.name),
          description: p.description,
          priceCents: Math.round(p.price * 100),
          stock: p.stock,
          active: p.active ?? true,
          categoryId: catBy(p.category).id,
          imageUrl: `https://picsum.photos/seed/nova-${i + 1}/600/600`,
        },
      }),
    ),
  );

  console.log("Creando pedidos de prueba...");
  const productBySlug = (slug: string) =>
    products.find((p) => p.slug === slug)!;

  type SeedOrder = {
    customerIndex: number;
    status: OrderStatus;
    lines: Array<{ slug: string; qty: number }>;
  };

  const seedOrders: SeedOrder[] = [
    {
      customerIndex: 0,
      status: "DELIVERED",
      lines: [
        { slug: slugify("Smartphone Nova X"), qty: 1 },
        { slug: slugify("Audifonos NovaSound ANC"), qty: 1 },
      ],
    },
    {
      customerIndex: 1,
      status: "CONFIRMED",
      lines: [{ slug: slugify("Laptop NovaBook 14"), qty: 1 }],
    },
    {
      customerIndex: 2,
      status: "PENDING",
      lines: [
        { slug: slugify("Mouse inalambrico NovaClick"), qty: 2 },
        { slug: slugify("Teclado mecanico NovaType"), qty: 1 },
      ],
    },
  ];

  for (const so of seedOrders) {
    const customer = customers[so.customerIndex];
    const items = so.lines.map((l) => {
      const product = productBySlug(l.slug);
      return {
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: l.qty,
        subtotalCents: product.priceCents * l.qty,
      };
    });
    const totalCents = items.reduce((acc, i) => acc + i.subtotalCents, 0);

    await prisma.order.create({
      data: {
        userId: customer.id,
        status: so.status,
        totalCents,
        shipName: customer.name,
        shipAddress: customer.address ?? "Direccion de prueba",
        shipPhone: customer.phone ?? "+51 900 000 000",
        items: { create: items },
      },
    });

    // Descontar stock para pedidos no cancelados (coherencia de datos)
    for (const l of so.lines) {
      const product = productBySlug(l.slug);
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: l.qty } },
      });
    }
  }

  console.log("\nSeed completado.");
  console.log("Usuarios de prueba:");
  console.log(`  ADMIN    -> ${admin.email} / Admin123`);
  customers.forEach((c) => console.log(`  CLIENTE  -> ${c.email} / Password123`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
