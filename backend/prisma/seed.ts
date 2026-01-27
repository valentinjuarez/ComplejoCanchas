import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD ?? '').trim();

  if (!email || !password) {
    throw new Error('Faltan ADMIN_EMAIL o ADMIN_PASSWORD en variables de entorno');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // ✅ Idempotente: si existe lo actualiza (por si querés rotar password)
  await prisma.adminUser.upsert({
    where: { email },
    update: {
      passwordHash,
      role: AdminRole.ADMIN,
    },
    create: {
      email,
      passwordHash,
      role: AdminRole.ADMIN,
    },
  });

  console.log(`✅ Seed OK: Admin listo (${email})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
