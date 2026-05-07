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
    password: 'Admin123!', // NOSONAR
    role: 'ADMIN'
  },
  {
    name: 'Cliente de Prueba',
    email: 'cliente@ecomart.com',
    password: 'Cliente123!',  // NOSONAR
    role: 'CUSTOMER'
  }
];

const SEED_PRODUCTS = [
  {
    id: 1,
    name: 'Teclado Mecánico Gaming RGB',
    description: 'Teclado mecánico con switches azules, retroiluminación RGB y conexión USB-C trenzada.',
    price: 349900,
    category: 'Tecnología',
    stock: 25,
    image: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=600&q=80',
    rating: 4.7
  },
  {
    id: 2,
    name: 'Gafas de Sol Polarizadas',
    description: 'Gafas unisex con protección UV400, lentes polarizadas y montura ligera de acetato.',
    price: 179900,
    category: 'Moda',
    stock: 70,
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80',
    rating: 4.5
  },
  {
    id: 3,
    name: 'Bicicleta Plegable Urbana',
    description: 'Bicicleta plegable de 7 velocidades, ideal para movilidad urbana y trayectos diarios.',
    price: 1299900,
    category: 'Deportes',
    stock: 12,
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&q=80',
    rating: 4.6
  },
  {
    id: 4,
    name: 'Robot Aspirador Inteligente',
    description: 'Robot aspirador con mapeo láser, app de control, succión potente y autonomía de 120 min.',
    price: 899900,
    category: 'Hogar',
    stock: 18,
    image: 'https://images.unsplash.com/photo-1567892737950-30c4db37cd89?w=600&q=80',
    rating: 4.8
  },
  {
    id: 5,
    name: 'Perfume Eau de Parfum 100ml',
    description: 'Fragancia oriental amaderada con notas de bergamota, sándalo y vainilla. Larga duración.',
    price: 279900,
    category: 'Belleza',
    stock: 35,
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80',
    rating: 4.7
  },
  {
    id: 6,
    name: 'Cámara Mirrorless 4K',
    description: 'Cámara sin espejo de 24MP con grabación 4K, estabilización de imagen y kit 18-55mm.',
    price: 2499900,
    category: 'Tecnología',
    stock: 8,
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80',
    rating: 4.9
  },
  {
    id: 7,
    name: 'Reloj Análogo Acero Inoxidable',
    description: 'Reloj clásico para hombre, correa de acero, resistente al agua 5ATM y movimiento suizo.',
    price: 459900,
    category: 'Moda',
    stock: 22,
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=600&q=80',
    rating: 4.6
  },
  {
    id: 8,
    name: 'Set de Sartenes Antiadherentes',
    description: 'Juego de 3 sartenes con recubrimiento cerámico libre de PFOA, aptas para inducción.',
    price: 189900,
    category: 'Hogar',
    stock: 40,
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    rating: 4.4
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
  console.log('\n📦 Cargando productos...');
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
  console.log('🛒 Seed de EcoMart');
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
