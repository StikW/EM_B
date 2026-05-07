/**
 * Script de inicialización (seed) para EcoMart.
 *
 * Crea:
 *   - 1 usuario administrador
 *   - 1 usuario cliente de prueba
 *   - Catálogo de productos mockeados
 *
 * Es IDEMPOTENTE: usa `upsert`, así se puede correr múltiples veces
 * sin duplicar registros.
 *
 * Cómo ejecutar:
 *   1. Configura tu DATABASE_URL en .env
 *   2. Aplica las migraciones:  npx prisma migrate deploy   (o `migrate dev`)
 *   3. Corre el seed:           npm run seed                (o `npx prisma db seed`)
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SEED_USERS = [
  {
    name: 'Administrador EcoMart',
    email: 'admin@ecomart.com',
    password: 'Admin123!',
    role: 'ADMIN'
  },
  {
    name: 'Cliente de Prueba',
    email: 'cliente@ecomart.com',
    password: 'Cliente123!',
    role: 'CUSTOMER'
  }
];

const SEED_PRODUCTS = [
  {
    id: 1,
    name: 'Botella Reutilizable de Bambú',
    description: 'Botella ecológica de 750ml fabricada con bambú sostenible y acero inoxidable.',
    price: 99900,
    category: 'Hogar',
    stock: 35,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&q=80',
    rating: 4.7
  },
  {
    id: 2,
    name: 'Bolsa de Algodón Orgánico',
    description: 'Bolsa reutilizable hecha 100% de algodón orgánico certificado.',
    price: 38000,
    category: 'Accesorios',
    stock: 120,
    image: 'https://images.unsplash.com/photo-1597484661973-ee6cd0b6482c?w=600&q=80',
    rating: 4.5
  },
  {
    id: 3,
    name: 'Cepillo Dental de Bambú',
    description: 'Pack de 4 cepillos dentales biodegradables con cerdas suaves.',
    price: 49900,
    category: 'Higiene',
    stock: 80,
    image: 'https://unsplash.com/es/fotos/palos-de-madera-marron-en-cuenco-de-ceramica-gris-7TgbRVEYdYY',
    rating: 4.8
  },
  {
    id: 4,
    name: 'Pajitas de Acero Inoxidable',
    description: 'Set de 6 pajitas reutilizables con cepillo de limpieza incluido.',
    price: 59900,
    category: 'Cocina',
    stock: 60,
    image: 'https://images.unsplash.com/photo-1572441710534-91e1f31a89aa?w=600&q=80',
    rating: 4.6
  },
  {
    id: 5,
    name: 'Jabón Natural Artesanal',
    description: 'Jabón vegano hecho a mano con aceites esenciales y sin químicos.',
    price: 29500,
    category: 'Higiene',
    stock: 200,
    image: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&q=80',
    rating: 4.9
  },
  {
    id: 6,
    name: 'Cargador Solar Portátil',
    description: 'Cargador solar de 10000mAh, ideal para viajes y emergencias.',
    price: 199900,
    category: 'Tecnología',
    stock: 25,
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=600&q=80',
    rating: 4.4
  },
  {
    id: 7,
    name: 'Compostera Doméstica',
    description: 'Compostera de cocina de 5L para reducir residuos orgánicos en casa.',
    price: 155000,
    category: 'Hogar',
    stock: 18,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80',
    rating: 4.3
  },
  {
    id: 8,
    name: 'Camiseta de Algodón Reciclado',
    description: 'Camiseta unisex fabricada con algodón reciclado y tintes naturales.',
    price: 89900,
    category: 'Ropa',
    stock: 45,
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
    rating: 4.6
  }
];

async function seedUsers() {
  console.log('\n👥 Cargando usuarios...');
  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        passwordHash,
        role: u.role
      },
      create: {
        name: u.name,
        email: u.email,
        passwordHash,
        role: u.role
      }
    });
    console.log(`   ✓ ${user.role.padEnd(8)}  ${user.email}`);
  }
}

async function seedProducts() {
  console.log('\n🌿 Cargando productos...');
  for (const p of SEED_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        category: p.category,
        stock: p.stock,
        image: p.image,
        rating: p.rating
      },
      create: p
    });
    const priceFmt = product.price.toLocaleString('es-CO');
    console.log(`   ✓ #${String(product.id).padStart(2, '0')}  ${product.name.padEnd(35)}  $${priceFmt}`);
  }
  // Mantener el contador del id sincronizado por si se usaron ids fijos
  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1));`
  );
}

async function main() {
  console.log('🌱 Seed de EcoMart');
  console.log('==================');
  await seedUsers();
  await seedProducts();

  const [usersCount, productsCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count()
  ]);
  console.log('\n✅ Seed completado');
  console.log(`   Usuarios totales:  ${usersCount}`);
  console.log(`   Productos totales: ${productsCount}`);
  console.log('\n🔑 Credenciales de prueba:');
  console.log('   ADMIN     →  admin@ecomart.com    /  Admin123!');
  console.log('   CUSTOMER  →  cliente@ecomart.com  /  Cliente123!\n');
}

main()
  .catch(err => {
    console.error('❌ Error en el seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
