// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaults = [
    { key: 'siteName', value: 'روم استور', type: 'STRING' },
    { key: 'primaryColor', value: '#8b5cf6', type: 'COLOR' },
    { key: 'fontFamily', value: 'Vazirmatn', type: 'STRING' },
    { key: 'borderRadius', value: '1.5rem', type: 'STRING' },
    { key: 'darkModeEnabled', value: 'false', type: 'BOOLEAN' },
    { key: 'logoUrl', value: '/logo.png', type: 'STRING' },
    { key: 'faviconUrl', value: '/favicon.ico', type: 'STRING' },
  ];

  for (const item of defaults) {
    await prisma.setting.upsert({
      where: { key: item.key },
      update: {},
      create: item,
    });
  }

  console.log('تنظیمات پیش‌فرض با موفقیت اضافه شد');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());