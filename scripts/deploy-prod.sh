#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERCEL_SCOPE="maleks-projects-5ef1c03"
PRODUCTION_ALIAS="https://tachi-back.vercel.app"

cd "$PROJECT_DIR"

read_env_value() {
  local file_path="$1"
  local key="$2"

  node -e '
    const fs = require("node:fs");
    const [filePath, key] = process.argv.slice(1);
    const content = fs.readFileSync(filePath, "utf8");
    const line = content
      .split(/\r?\n/)
      .find((item) => item.startsWith(`${key}=`));

    if (!line) {
      process.exit(0);
    }

    let value = line.slice(key.length + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.stdout.write(value);
  ' "$file_path" "$key"
}

require_command() {
  local command_name="$1"

  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
}

require_command pnpm
require_command vercel
require_command node
require_command curl

echo "==> Type-checking"
pnpm lint:ts

echo "==> Pulling Vercel production environment"
vercel pull --yes --environment=production --scope "$VERCEL_SCOPE"

r2_access_key_id="$(read_env_value .env S3_ACCESS_KEY_ID)"
r2_secret_access_key="$(read_env_value .env S3_SECRET_ACCESS_KEY)"

if [[ -z "$r2_access_key_id" || -z "$r2_secret_access_key" ]]; then
  echo "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must exist in .env for local prebuilt builds." >&2
  exit 1
fi

echo "==> Building Vercel prebuilt output"
R2_LOCAL_ACCESS_KEY_ID="$r2_access_key_id" \
  R2_LOCAL_SECRET_ACCESS_KEY="$r2_secret_access_key" \
  node <<'NODE'
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function parseDotenv(filePath) {
  const env = {};
  const content = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const env = {
  ...process.env,
  ...parseDotenv('.vercel/.env.production.local'),
  S3_ACCESS_KEY_ID: process.env.R2_LOCAL_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.R2_LOCAL_SECRET_ACCESS_KEY,
};

const result = spawnSync(
  'vercel',
  ['build', '--prod', '--scope', 'maleks-projects-5ef1c03'],
  {
    env,
    stdio: 'inherit',
  }
);

process.exit(result.status ?? 1);
NODE

echo "==> Deploying prebuilt output to production"
deploy_output="$(vercel deploy --prebuilt --prod --scope "$VERCEL_SCOPE" 2>&1)"
echo "$deploy_output"

deployment_url="$(
  printf '%s\n' "$deploy_output" |
    sed -n 's/.*Production: \(https:\/\/[^ ]*\).*/\1/p' |
    tail -n 1
)"

if [[ -z "$deployment_url" ]]; then
  deployment_url="$PRODUCTION_ALIAS"
fi

echo "==> Inspecting deployment"
vercel inspect "$deployment_url" --scope "$VERCEL_SCOPE"

echo "==> Verifying mobile route health"
health_response="$(curl -i -s -X POST "$PRODUCTION_ALIAS/api/mobile/subscription/cancel")"
echo "$health_response"

if ! printf '%s' "$health_response" | grep -q 'HTTP/2 401'; then
  echo "Expected health check HTTP status 401." >&2
  exit 1
fi

if ! printf '%s' "$health_response" | grep -q '"code":"invalid_session"'; then
  echo "Expected health check error code invalid_session." >&2
  exit 1
fi

echo "==> Production deploy verified: $PRODUCTION_ALIAS"
