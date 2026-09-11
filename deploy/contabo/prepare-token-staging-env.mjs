// Run on Contabo only: node --input-type=module - --apply < this-file
// Existing staging credentials stay on the VPS and are never printed.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { parseEnv } from 'node:util';

const root = '/opt/tachi-back-staging';
const source = '/opt/tachi-back/.env.staging';
const target = `${root}/.env.staging`;
if (!existsSync(root) || realpathSync(root) !== root)
  throw new Error('Missing isolated staging directory');
const original = readFileSync(existsSync(target) ? target : source, 'utf8');
const updates = {
  TACHI_ENV_SLUG: 'staging',
  TACHI_ENV_FILE: target,
  VITE_BASE_URL: 'https://staging.62.171.171.212.sslip.io',
  VITE_ENV_NAME: 'STAGING',
  VITE_ANDROID_APP_ID: 'app.tachiback.tachiyomi.at.tokenstest',
  VITE_GOOGLE_ANALYTICS_ID: '',
  LEMONSQUEEZY_ENABLED: 'true',
  LEMONSQUEEZY_TEST_MODE: 'true',
  LEMONSQUEEZY_ONE_TIME_VARIANT_STARTER: '2115674',
  LEMONSQUEEZY_ONE_TIME_VARIANT_PRO: '2115687',
  LEMONSQUEEZY_ONE_TIME_VARIANT_POWER: '2115698',
  ANDROID_APP_LINK_SHA256_FINGERPRINTS:
    'A0:C3:B7:70:82:F8:7A:87:5A:1A:D8:CA:FA:BA:86:83:35:C0:1A:5E:5D:CE:FB:B1:DD:12:9A:AB:46:81:46:42',
  TACHI_SEO_AGENT_STATE_DIR: `${root}/runtime/seo`,
  TACHI_MANHWA_CONTEXT_DIR: `${root}/runtime/manhwa-context`,
  TACHI_MANHWA_PRIVATE_DIR: `${root}/runtime/manhwa-private`,
  TRANSLATION_QA_AGENT_ENABLED: 'false',
  OPENAI_PORNOGRAPHY_MODERATION_ENABLED: 'false',
  // Default payment-only staging disables paid providers and uses DB-inline storage, never production R2.
  S3_HOST: '127.0.0.1:9',
  S3_SECURE: 'false',
  S3_ACCESS_KEY_ID: 'staging-storage-disabled',
  S3_SECRET_ACCESS_KEY: 'staging-storage-disabled',
  GOOGLE_CLOUD_VISION_API_KEY: '',
  GOOGLE_CLOUD_TRANSLATE_API_KEY: '',
  GEMINI_API_KEY: '',
  OPENAI_API_KEY: '',
  OPENROUTER_API_KEY: '',
  ANTHROPIC_API_KEY: '',
};
if (process.argv.includes('--with-openai')) {
  const existing = parseEnv(readFileSync(source, 'utf8'));
  if (!existing.OPENAI_API_KEY?.startsWith('sk-'))
    throw new Error('No existing staging OpenAI key to reuse');
  if (!existing.GOOGLE_CLOUD_VISION_API_KEY)
    throw new Error(
      'No existing staging OCR key for the hosted chapter pipeline'
    );
  updates.OPENAI_API_KEY = existing.OPENAI_API_KEY;
  // Hosted translation first reads the chapter text with the existing OCR provider.
  updates.GOOGLE_CLOUD_VISION_API_KEY = existing.GOOGLE_CLOUD_VISION_API_KEY;
  updates.OCR_PROVIDER_PRIMARY = 'google_cloud_vision';
  updates.TRANSLATION_PROVIDER_PRIMARY = 'openai';
  updates.OPENAI_TRANSLATION_MODEL = 'gpt-5-mini';
}
if (process.argv.includes('--with-current-ocr')) {
  if (!process.argv.includes('--with-openai'))
    throw new Error(
      'Current OCR reuse requires an authorized hosted translation test'
    );
  // Read one working provider credential; never mutate production or copy its storage/database settings.
  const runtime = JSON.parse(
    execFileSync(
      'docker',
      ['inspect', 'tachi-production-app', '--format', '{{json .Config.Env}}'],
      {
        encoding: 'utf8',
      }
    )
  );
  const currentOcr = runtime
    .find((entry) => entry.startsWith('GOOGLE_CLOUD_VISION_API_KEY='))
    ?.split('=')
    .slice(1)
    .join('=');
  if (!currentOcr)
    throw new Error('Current Nayovi OCR credential is unavailable');
  updates.GOOGLE_CLOUD_VISION_API_KEY = currentOcr;
}
if (!parseEnv(original).CRON_SECRET)
  updates.CRON_SECRET = randomBytes(32).toString('hex');
console.log(
  JSON.stringify({
    target,
    updatedKeys: Object.keys(updates),
    apply: process.argv.includes('--apply'),
  })
);
if (process.argv.includes('--apply')) {
  const backup = `/opt/tachi-staging-backups/env-${new Date().toISOString().replaceAll(':', '-')}`;
  mkdirSync(backup, { recursive: true, mode: 0o700 });
  copyFileSync(existsSync(target) ? target : source, `${backup}/env.staging`);
  const preserved = original
    .split('\n')
    .filter((line) => !Object.hasOwn(updates, line.split('=', 1)[0].trim()));
  const configured = Object.entries(updates).map(
    ([key, value]) => `${key}=${JSON.stringify(value)}`
  );
  writeFileSync(target, [...preserved, ...configured, ''].join('\n'), {
    mode: 0o600,
  });
  for (const dir of [
    updates.TACHI_SEO_AGENT_STATE_DIR,
    updates.TACHI_MANHWA_CONTEXT_DIR,
    updates.TACHI_MANHWA_PRIVATE_DIR,
  ]) {
    mkdirSync(dir, { recursive: true });
  }
  console.log(
    'Isolated staging configuration prepared; no credential values printed.'
  );
}
