import { execFile } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { db } from '@/server/db';
import { importSourceSearchMethodsFromExtensionsSource } from '@/server/source-discovery/service';

const execFileAsync = promisify(execFile);

async function main() {
  const sourceRoot =
    process.env.EXTENSIONS_SOURCE_DIR ??
    path.resolve(process.cwd(), '../extensions-source');

  await access(sourceRoot);

  if (process.env.SOURCE_DISCOVERY_SKIP_GIT_PULL !== '1') {
    await execFileAsync('git', ['pull', '--ff-only'], {
      cwd: sourceRoot,
    }).catch((error) => {
      console.warn(
        `Could not fast-forward extensions-source; importing current checkout instead. ${String(
          error?.message ?? error
        )}`
      );
    });
  }

  const result = await importSourceSearchMethodsFromExtensionsSource();

  console.info(
    `Imported ${result.imported}/${result.total} source search methods (${result.unsupported} unsupported).`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
