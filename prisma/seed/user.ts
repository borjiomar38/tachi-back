import { db } from '@/server/db';

import { emphasis } from './_utils';

export async function createUsers() {
  console.log(`⏳ Seeding internal admin/staff users`);

  const existingCount = await db.user.count();
  let createdCounter = 0;
  const seededAt = new Date();

  const support = await db.user.upsert({
    where: { email: 'support@tachi-back.local' },
    create: {
      name: 'Support',
      email: 'support@tachi-back.local',
      emailVerified: true,
      onboardedAt: seededAt,
      role: 'support',
    },
    update: {
      name: 'Support',
      emailVerified: true,
      role: 'support',
    },
    select: { createdAt: true },
  });

  if (support.createdAt.getTime() === seededAt.getTime()) {
    createdCounter += 1;
  }

  const admin = await db.user.upsert({
    where: { email: 'admin@tachi-back.local' },
    create: {
      name: 'Admin',
      email: 'admin@tachi-back.local',
      emailVerified: true,
      role: 'admin',
      onboardedAt: seededAt,
    },
    update: {
      name: 'Admin',
      emailVerified: true,
      role: 'admin',
    },
    select: { createdAt: true },
  });

  if (admin.createdAt.getTime() === seededAt.getTime()) {
    createdCounter += 1;
  }

  console.log(
    `✅ ${existingCount} existing user 👉 ${createdCounter} internal admin/staff users created`
  );
  console.log(`👉 Admin connect with: ${emphasis('admin@tachi-back.local')}`);
  console.log(
    `👉 Support connect with: ${emphasis('support@tachi-back.local')}`
  );
}
