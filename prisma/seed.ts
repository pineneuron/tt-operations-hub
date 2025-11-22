import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: 'anupam.achhami@gmail.com' },
    update: {},
    create: {
      email: 'anupam.achhami@gmail.com',
      username: 'admin',
      name: 'Platform Admin',
      passwordHash: hashedPassword,
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      emailVerified: new Date()
    }
  });

  const maheshAdmin = await prisma.user.upsert({
    where: { email: 'maheshbohara0101@gmail.com' },
    update: {},
    create: {
      email: 'maheshbohara0101@gmail.com',
      username: 'mahesh',
      name: 'Mahesh Bohara',
      passwordHash: hashedPassword,
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      emailVerified: new Date()
    }
  });

  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@techtrust.com.np' },
    update: {},
    create: {
      email: 'staff@techtrust.com.np',
      username: 'staff',
      name: 'Staff User',
      passwordHash: hashedPassword,
      role: UserRole.STAFF,
      isActive: true,
      emailVerified: new Date()
    }
  });

  const financeUser = await prisma.user.upsert({
    where: { email: 'finance@techtrust.com.np' },
    update: {},
    create: {
      email: 'finance@techtrust.com.np',
      username: 'finance',
      name: 'Finance User',
      passwordHash: hashedPassword,
      role: UserRole.FINANCE,
      isActive: true,
      emailVerified: new Date()
    }
  });

  console.log('✅ Created users:');
  console.log(`   - Admin: admin@techtrust.com.np (password: password123)`);
  console.log(`   - Admin: maheshbohara0101@gmail.com (password: password123)`);
  console.log(`   - Staff: staff@techtrust.com.np (password: password123)`);
  console.log(`   - Finance: finance@techtrust.com.np (password: password123)`);
  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
