import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const createHash = crypto.createHash;


function sha256Hex(str: string) {
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

async function hashPassword(plain: string) {
  // match the project format "salt:hash" (salt is hex of 16 random bytes)
  const salt = Buffer.from(crypto.randomBytes(16)).toString('hex');
  const hash = sha256Hex(salt + plain);
  return `${salt}:${hash}`;
}



const prisma = new PrismaClient();

async function main() {
  const email = 'admin@gmail.com';
  const password = '123456';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`[seed] User already exists for email=${email}, id=${existing.id}`);
    return;
  }

  const hashed = await hashPassword(password);
  await prisma.user.create({
    data: {
      email,
      password: hashed,
      role: 'ADMIN',
      name: 'admin',
    },
  });

  console.log(`[seed] Created ADMIN user: ${email}`);
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

