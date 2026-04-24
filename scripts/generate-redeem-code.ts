import { randomUUID } from 'node:crypto';

import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { UNLIMITED_DEVICE_LIMIT } from '@/server/licenses/device-limit';
import { generateRedeemCode } from '@/server/licenses/utils';

type CliOptions = {
  createdByUserId?: string;
  deviceLimit: number;
  dryRun: boolean;
  email?: string;
  expiresAt?: Date;
  licenseKey?: string;
  newLicense: boolean;
  notes?: string;
  packKey?: string;
  reason?: string;
  tokenAmount?: number;
};

type GrantResult = {
  availableTokensAdded: number;
  expiresAt: Date | null;
  licenseId: string;
  licenseKey: string;
  ownerEmail: string | null;
  redeemCode: string;
};

type RedeemGrantDb = Pick<
  typeof db,
  'license' | 'redeemCode' | 'tokenLedger' | 'tokenPack'
>;

const args = getScriptArgs();

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

const options = parseArgs(args);

try {
  const result = options.dryRun
    ? await previewGrant(options)
    : await createRedeemGrant(options);

  console.log('Redeem code generated');
  console.log(`Code: ${result.redeemCode}`);
  console.log(`License key: ${result.licenseKey}`);
  console.log(`License id: ${result.licenseId}`);
  console.log(`Owner email: ${result.ownerEmail ?? 'none'}`);
  console.log(`Tokens added: ${result.availableTokensAdded}`);
  console.log(`Expires at: ${result.expiresAt?.toISOString() ?? 'never'}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}

async function createRedeemGrant(options: CliOptions): Promise<GrantResult> {
  return db.$transaction(async (tx) => {
    const tokenAmount = await resolveTokenAmount(tx, options);
    const grantId = randomUUID();
    const now = new Date();
    const license = await resolveLicense(tx, options);
    const redeemCodeValue = await createUniqueRedeemCode(tx);

    const redeemCode = await tx.redeemCode.create({
      data: {
        code: redeemCodeValue,
        createdByUserId: options.createdByUserId,
        expiresAt: options.expiresAt,
        licenseId: license.id,
        metadata: {
          grantId,
          packKey: options.packKey,
          reason: options.reason,
          source: 'redeem_code_script',
        } satisfies Prisma.InputJsonObject,
      },
      select: {
        code: true,
        expiresAt: true,
        id: true,
      },
    });

    if (tokenAmount > 0) {
      await tx.tokenLedger.create({
        data: {
          deltaTokens: tokenAmount,
          description: options.reason ?? 'Manual redeem code credit',
          idempotencyKey: `manual:redeem-code-script:${grantId}:credit`,
          licenseId: license.id,
          metadata: {
            grantId,
            grantedAt: now.toISOString(),
            packKey: options.packKey,
            source: 'redeem_code_script',
          } satisfies Prisma.InputJsonObject,
          redeemCodeId: redeemCode.id,
          status: 'posted',
          type: 'manual_credit',
        },
      });
    }

    return {
      availableTokensAdded: tokenAmount,
      expiresAt: redeemCode.expiresAt,
      licenseId: license.id,
      licenseKey: license.key,
      ownerEmail: license.ownerEmail,
      redeemCode: redeemCode.code,
    };
  });
}

async function previewGrant(options: CliOptions): Promise<GrantResult> {
  const tokenAmount = await resolveTokenAmount(db, options);
  const existingLicense = await findReusableLicense(db, options);

  return {
    availableTokensAdded: tokenAmount,
    expiresAt: options.expiresAt ?? null,
    licenseId: existingLicense?.id ?? 'new-license',
    licenseKey: existingLicense?.key ?? 'new-license-key',
    ownerEmail: existingLicense?.ownerEmail ?? options.email ?? null,
    redeemCode: generateRedeemCode(),
  };
}

async function resolveLicense(tx: RedeemGrantDb, options: CliOptions) {
  if (options.licenseKey) {
    const license = await tx.license.findUnique({
      where: { key: options.licenseKey },
      select: {
        id: true,
        key: true,
        ownerEmail: true,
        status: true,
      },
    });

    if (!license) {
      throw new Error(`No license found for key ${options.licenseKey}`);
    }

    if (['expired', 'revoked', 'suspended'].includes(license.status)) {
      throw new Error(
        `License ${license.key} is ${license.status}; refusing to attach a new redeem code.`
      );
    }

    return license;
  }

  const reusableLicense = await findReusableLicense(tx, options);
  if (reusableLicense) {
    return reusableLicense;
  }

  return tx.license.create({
    data: {
      deviceLimit: options.deviceLimit,
      notes: options.notes ?? options.reason ?? 'Created by redeem code script',
      ownerEmail: options.email,
      status: 'pending',
    },
    select: {
      id: true,
      key: true,
      ownerEmail: true,
      status: true,
    },
  });
}

async function findReusableLicense(tx: RedeemGrantDb, options: CliOptions) {
  if (options.licenseKey) {
    return tx.license.findUnique({
      where: { key: options.licenseKey },
      select: {
        id: true,
        key: true,
        ownerEmail: true,
        status: true,
      },
    });
  }

  if (!options.email || options.newLicense) {
    return null;
  }

  const activeLicense = await tx.license.findFirst({
    where: {
      ownerEmail: options.email,
      status: 'active',
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      key: true,
      ownerEmail: true,
      status: true,
    },
  });

  if (activeLicense) {
    return activeLicense;
  }

  return tx.license.findFirst({
    where: {
      ownerEmail: options.email,
      status: 'pending',
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      key: true,
      ownerEmail: true,
      status: true,
    },
  });
}

async function createUniqueRedeemCode(tx: Pick<RedeemGrantDb, 'redeemCode'>) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateRedeemCode();
    const existing = await tx.redeemCode.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Failed to generate a unique redeem code after 5 attempts.');
}

async function resolveTokenAmount(
  client: Pick<RedeemGrantDb, 'tokenPack'>,
  options: CliOptions
) {
  if (options.tokenAmount !== undefined) {
    return options.tokenAmount;
  }

  if (!options.packKey) {
    throw new Error(
      'Pass either --tokens <amount> or --pack <starter|pro|power>.'
    );
  }

  const tokenPack = await client.tokenPack.findUnique({
    where: { key: options.packKey },
    select: {
      bonusTokenAmount: true,
      key: true,
      tokenAmount: true,
    },
  });

  if (!tokenPack) {
    throw new Error(`No token pack found for key ${options.packKey}`);
  }

  return tokenPack.tokenAmount + tokenPack.bonusTokenAmount;
}

function parseArgs(rawArgs: string[]): CliOptions {
  const values = readFlags(rawArgs);
  const tokenAmount = optionalInt(values.tokens, '--tokens', 0);
  const deviceLimit =
    optionalInt(values['device-limit'], '--device-limit', 0) ??
    UNLIMITED_DEVICE_LIMIT;
  const expiresAt = parseExpiry(values);

  if (values.tokens !== undefined && values.pack !== undefined) {
    throw new Error('Use either --tokens or --pack, not both.');
  }

  if (tokenAmount === undefined && values.pack === undefined) {
    throw new Error(
      'Pass either --tokens <amount> or --pack <starter|pro|power>.'
    );
  }

  if (values['license-key'] === undefined && tokenAmount === 0) {
    throw new Error(
      'A new license needs positive tokens. Pass --tokens > 0 or --pack.'
    );
  }

  return {
    createdByUserId: values['created-by-user-id'],
    deviceLimit,
    dryRun: values['dry-run'] === 'true',
    email: values.email,
    expiresAt,
    licenseKey: values['license-key'],
    newLicense: values['new-license'] === 'true',
    notes: values.notes,
    packKey: values.pack,
    reason: values.reason,
    tokenAmount,
  };
}

function readFlags(rawArgs: string[]) {
  const values: Record<string, string | undefined> = {};

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg?.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const inlineValueSeparator = arg.indexOf('=');
    if (inlineValueSeparator > -1) {
      values[arg.slice(2, inlineValueSeparator)] = arg.slice(
        inlineValueSeparator + 1
      );
      continue;
    }

    const key = arg.slice(2);
    const nextArg = rawArgs[index + 1];
    if (!nextArg || nextArg.startsWith('--')) {
      values[key] = 'true';
      continue;
    }

    values[key] = nextArg;
    index += 1;
  }

  return values;
}

function optionalInt(
  value: string | undefined,
  flagName: string,
  minimum: number
) {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${flagName} must be an integer >= ${minimum}.`);
  }

  return parsed;
}

function parseExpiry(values: Record<string, string | undefined>) {
  if (values['expires-at'] && values['expires-in-days']) {
    throw new Error('Use either --expires-at or --expires-in-days, not both.');
  }

  if (values['expires-at']) {
    const date = new Date(values['expires-at']);
    if (Number.isNaN(date.getTime())) {
      throw new Error('--expires-at must be a valid date.');
    }
    return date;
  }

  const expiresInDays = optionalInt(
    values['expires-in-days'],
    '--expires-in-days',
    1
  );

  if (expiresInDays === undefined) {
    return undefined;
  }

  const date = new Date();
  date.setUTCDate(date.getUTCDate() + expiresInDays);
  return date;
}

function getScriptArgs() {
  const scriptIndex = process.argv.findIndex((arg) =>
    arg.endsWith('generate-redeem-code.ts')
  );
  const startIndex = scriptIndex >= 0 ? scriptIndex + 1 : 2;

  return process.argv.slice(startIndex).filter((arg) => arg !== '--');
}

function printHelp() {
  console.log(`Generate a fresh redeem code.

Usage:
  pnpm redeem:generate -- --email reader@example.com --pack starter
  pnpm redeem:generate -- --license-key <key> --tokens 500
  pnpm redeem:generate -- --email reader@example.com --tokens 1000 --expires-in-days 30

Options:
  --tokens <amount>              Tokens to credit. Can be 0 only with --license-key.
  --pack <starter|pro|power>     Credit the total tokens from an existing token pack.
  --email <email>                Owner email for a new license.
  --license-key <key>            Attach the new redeem code to an existing license.
  --new-license                  Force a separate license even if --email already has one.
  --device-limit <number>        Device limit for a new license. Defaults to 0, unlimited.
  --expires-at <date>            ISO date/time when the redeem code expires.
  --expires-in-days <days>       Relative expiry in whole days.
  --reason <text>                Description for the manual credit ledger entry.
  --notes <text>                 Notes for a newly created license.
  --created-by-user-id <id>      Optional internal user id to store on the redeem code.
  --dry-run                      Print a preview without writing to the database.
`);
}
