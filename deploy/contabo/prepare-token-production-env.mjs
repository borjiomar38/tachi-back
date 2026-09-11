// Run only on the production VPS. Preview by default; --apply preserves a private backup.
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { parseEnv } from 'node:util';

const root = '/opt/tachi-back';
const target = `${root}/.env.production`;
if (realpathSync(root) !== root)
  throw new Error('Unexpected production directory');
const original = readFileSync(target, 'utf8');
const current = parseEnv(original);
if (
  current.VITE_ENV_NAME !== 'PRODUCTION' ||
  current.VITE_BASE_URL !== 'https://tachiyomiat.com'
) {
  throw new Error('Unexpected production identity');
}
if (
  !current.LEMONSQUEEZY_API_KEY ||
  current.LEMONSQUEEZY_STORE_ID !== '331539'
) {
  throw new Error('Production Lemon Squeezy credentials/store unavailable');
}

const packs = [
  {
    key: 'STARTER',
    variant: '2116808',
    product: '1355464',
    cents: 200,
    tokens: 250,
  },
  {
    key: 'PRO',
    variant: '2116810',
    product: '1355466',
    cents: 1000,
    tokens: 1250,
  },
  {
    key: 'POWER',
    variant: '2116813',
    product: '1355469',
    cents: 2000,
    tokens: 2750,
  },
];
const getResource = async (path) => {
  const response = await fetch(`https://api.lemonsqueezy.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${current.LEMONSQUEEZY_API_KEY}`,
      Accept: 'application/vnd.api+json',
    },
  });
  if (!response.ok)
    throw new Error(`Lemon resource validation failed: ${response.status}`);
  return (await response.json()).data.attributes;
};
for (const pack of packs) {
  const variant = await getResource(`variants/${pack.variant}`);
  const product = await getResource(`products/${pack.product}`);
  if (
    String(variant.product_id) !== pack.product ||
    variant.is_subscription !== false ||
    variant.price !== pack.cents ||
    product.test_mode !== false ||
    product.status !== 'published' ||
    String(product.store_id) !== current.LEMONSQUEEZY_STORE_ID
  ) {
    throw new Error(`Live one-time pack validation failed: ${pack.key}`);
  }
}
const updates = {
  VITE_ANDROID_APP_ID: 'app.tachiback.tachiyomi.at',
  LEMONSQUEEZY_TEST_MODE: 'false',
  ANDROID_APP_LINK_SHA256_FINGERPRINTS:
    '6A:BC:17:BB:CA:89:A5:9D:B3:1E:9A:BF:2C:FA:38:E2:58:F5:EB:50:34:E1:D0:A5:71:09:08:FE:EA:05:50:3D',
  ...Object.fromEntries(
    packs.map((pack) => [
      `LEMONSQUEEZY_ONE_TIME_VARIANT_${pack.key}`,
      pack.variant,
    ])
  ),
};
console.log(
  JSON.stringify({
    target,
    apply: process.argv.includes('--apply'),
    validatedPacks: packs,
    updatedKeys: Object.keys(updates),
  })
);
if (process.argv.includes('--apply')) {
  const backup = `/opt/tachi-production-backups/token-release-${new Date().toISOString().replaceAll(':', '-')}`;
  mkdirSync(backup, { recursive: true, mode: 0o700 });
  copyFileSync(target, `${backup}/env.production`);
  chmodSync(`${backup}/env.production`, 0o600);
  const retained = original
    .split('\n')
    .filter((line) => !Object.hasOwn(updates, line.split('=', 1)[0].trim()));
  writeFileSync(
    target,
    [
      ...retained,
      ...Object.entries(updates).map(
        ([key, value]) => `${key}=${JSON.stringify(value)}`
      ),
      '',
    ].join('\n'),
    { mode: 0o600 }
  );
  chmodSync(target, 0o600);
  console.log(
    JSON.stringify({
      backup,
      result:
        'Production purchase configuration prepared; no service restarted.',
    })
  );
}
