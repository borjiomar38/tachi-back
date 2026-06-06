#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const DEFAULT_PRIVATE_ROOT = 'docs/manhwa/private';

function readFlag(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function readIntegerFlag(name, fallback) {
  const value = Number.parseInt(readFlag(name, String(fallback)), 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function safeSlug(value) {
  if (!/^[a-z0-9-]+$/.test(value)) {
    throw new Error(`Invalid series slug: ${value}`);
  }

  return value;
}

function posterShadowSvg(width, height) {
  return Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.12"/>
      <stop offset="58%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.32"/>
    </linearGradient>
    <radialGradient id="moon" cx="52%" cy="12%" r="56%">
      <stop offset="0%" stop-color="#d9d4ff" stop-opacity="0.2"/>
      <stop offset="70%" stop-color="#2b2443" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#shade)"/>
  <rect width="100%" height="100%" fill="url(#moon)"/>
</svg>`);
}

async function main() {
  const privateRoot = readFlag('--private-root', DEFAULT_PRIVATE_ROOT);
  const seriesSlug = safeSlug(readFlag('--series-slug', 'the-eclipse-crown'));
  const chapterNumber = readIntegerFlag('--chapter-number', 1);
  const panelNumber = readIntegerFlag('--panel-number', 1);
  const width = readIntegerFlag('--width', 1200);
  const height = readIntegerFlag('--height', 1600);
  const seriesDir = path.join(privateRoot, seriesSlug);
  const sourcePath = path.join(
    seriesDir,
    `chapter-${String(chapterNumber).padStart(3, '0')}`,
    `panel-${String(panelNumber).padStart(3, '0')}.png`
  );
  const outputPath = path.join(seriesDir, 'poster.png');
  const tmpPath = `${outputPath}.tmp`;

  await fs.mkdir(seriesDir, { recursive: true });

  const background = await sharp(sourcePath)
    .resize(width, height, { fit: 'cover' })
    .blur(24)
    .modulate({ brightness: 0.72, saturation: 0.86 })
    .png()
    .toBuffer();
  const foreground = await sharp(sourcePath)
    .resize(width, height, {
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      fit: 'contain',
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      background: '#030307',
      channels: 4,
      height,
      width,
    },
  })
    .composite([
      { input: background, left: 0, top: 0 },
      { input: foreground, left: 0, top: 0 },
      { input: posterShadowSvg(width, height), left: 0, top: 0 },
    ])
    .png()
    .toFile(tmpPath);

  await fs.rename(tmpPath, outputPath);
  await fs.chmod(outputPath, 0o664).catch(() => {});

  console.log(
    JSON.stringify(
      {
        output_path: outputPath,
        source_path: sourcePath,
        dimensions: { height, width },
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
