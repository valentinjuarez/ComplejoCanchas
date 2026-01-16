import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Faltan ADMIN_EMAIL o ADMIN_PASSWORD en el .env');
  }

  // ✅ No pisar si ya existe
  const existing = await prisma.adminUser.findUnique({ where: { email } });

  if (existing) {
    console.log(`ℹ️ Admin ya existe (${email}). No se modificó.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.adminUser.create({
    data: {
      email,
      passwordHash,
      role: AdminRole.ADMIN,
    },
  });

  console.log(`✅ Admin creado: ${email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
