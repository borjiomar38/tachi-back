import { db } from '@/server/db';

import { createBackofficeDemoData } from './backoffice-demo';
import { createTokenPacks } from './token-pack';
import { createUsers } from './user';

async function main() {
  await createUsers();
  await createTokenPacks();
  await createBackofficeDemoData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect();
  });
