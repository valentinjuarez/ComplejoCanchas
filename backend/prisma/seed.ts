import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Faltan ADMIN_EMAIL o ADMIN_PASSWORD en el .env');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Upsert: si existe, lo actualiza; si no, lo crea
  await prisma.usuario.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      passwordHash,
      name: 'Admin',
    },
    create: {
      email,
      name: 'Admin',
      role: Role.ADMIN,
      passwordHash,
    },
  });
  console.log('Usuario administrador creado o actualizado correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
