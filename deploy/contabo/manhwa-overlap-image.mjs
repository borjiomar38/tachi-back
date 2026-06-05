#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const args = process.argv.slice(2);
const command = args.shift();
const sharp = loadSharp();

function loadSharp() {
  const roots = [
    process.env.MANHWA_APP_DIR,
    process.env.TACHI_APP_DIR,
    process.cwd(),
    '/opt/tachi-back',
  ].filter(Boolean);

  for (const root of roots) {
    const packageJson = path.join(root, 'package.json');
    if (!existsSync(packageJson)) {
      continue;
    }

    try {
      return createRequire(packageJson)('sharp');
    } catch {
      // Try the next root.
    }
  }

  try {
    return createRequire(import.meta.url)('sharp');
  } catch (error) {
    throw new Error(
      `Could not load sharp. Run from the app directory or set TACHI_APP_DIR. ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function usage() {
  console.error(`Usage:
  manhwa-overlap-image.mjs prepare --previous PANEL.png --output CROP.png [--ratio 0.3]
  manhwa-overlap-image.mjs canvas --previous PANEL.png --overlap-output CROP.png --canvas-output CANVAS.png [--ratio 0.3] [--target-height 1600]
  manhwa-overlap-image.mjs trim --input RAW.png --output PANEL.png [--ratio 0.3] [--min-width 900] [--min-height 1200]
`);
}

function readFlag(name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) {
    return fallback;
  }
  return args[index + 1] ?? fallback;
}

function readNumberFlag(name, fallback) {
  const value = Number.parseFloat(readFlag(name, String(fallback)));
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a number.`);
  }
  return value;
}

function readRequiredFlag(name) {
  const value = readFlag(name);
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return path.resolve(value);
}

function readRatio() {
  const ratio = readNumberFlag('--ratio', 0.3);
  if (ratio <= 0 || ratio >= 0.8) {
    throw new Error('--ratio must be greater than 0 and lower than 0.8.');
  }
  return ratio;
}

async function prepare() {
  const previous = readRequiredFlag('--previous');
  const output = readRequiredFlag('--output');
  const ratio = readRatio();
  const image = sharp(previous);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions: ${previous}`);
  }

  const cropHeight = Math.max(1, Math.round(metadata.height * ratio));
  await image
    .extract({
      height: cropHeight,
      left: 0,
      top: metadata.height - cropHeight,
      width: metadata.width,
    })
    .png()
    .toFile(output);

  console.log(
    JSON.stringify(
      {
        cropHeight,
        output,
        previous,
        ratio,
        sourceHeight: metadata.height,
        sourceWidth: metadata.width,
      },
      null,
      2
    )
  );
}

async function canvas() {
  const previous = readRequiredFlag('--previous');
  const overlapOutput = readRequiredFlag('--overlap-output');
  const canvasOutput = readRequiredFlag('--canvas-output');
  const ratio = readRatio();
  const image = sharp(previous);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions: ${previous}`);
  }

  const targetHeight = Math.max(
    1,
    Math.round(readNumberFlag('--target-height', metadata.height))
  );
  const cropHeight = Math.max(1, Math.round(targetHeight * ratio));
  const sourceTop = Math.max(0, metadata.height - cropHeight);
  const sourceHeight = metadata.height - sourceTop;
  const rawHeight = targetHeight + sourceHeight;

  const cropBuffer = await image
    .clone()
    .extract({
      height: sourceHeight,
      left: 0,
      top: sourceTop,
      width: metadata.width,
    })
    .png()
    .toBuffer();

  await sharp(cropBuffer).png().toFile(overlapOutput);

  await sharp({
    create: {
      width: metadata.width,
      height: rawHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropBuffer, left: 0, top: 0 }])
    .png()
    .toFile(canvasOutput);

  console.log(
    JSON.stringify(
      {
        canvasOutput,
        cropHeight: sourceHeight,
        overlapOutput,
        previous,
        ratio,
        rawHeight,
        sourceHeight: metadata.height,
        sourceWidth: metadata.width,
        targetHeight,
      },
      null,
      2
    )
  );
}

async function trim() {
  const input = readRequiredFlag('--input');
  const output = readRequiredFlag('--output');
  const ratio = readRatio();
  const minWidth = Math.round(readNumberFlag('--min-width', 900));
  const minHeight = Math.round(readNumberFlag('--min-height', 1200));
  const image = sharp(input);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not read image dimensions: ${input}`);
  }

  const overlapFractionOfRaw = ratio / (1 + ratio);
  const cropTop = Math.max(
    1,
    Math.round(metadata.height * overlapFractionOfRaw)
  );
  const finalHeight = metadata.height - cropTop;

  if (metadata.width < minWidth || finalHeight < minHeight) {
    throw new Error(
      `Trimmed image would be ${metadata.width}x${finalHeight}; expected at least ${minWidth}x${minHeight}.`
    );
  }

  await image
    .extract({
      height: finalHeight,
      left: 0,
      top: cropTop,
      width: metadata.width,
    })
    .png()
    .toFile(output);

  console.log(
    JSON.stringify(
      {
        cropTop,
        finalHeight,
        input,
        output,
        ratio,
        rawHeight: metadata.height,
        rawWidth: metadata.width,
      },
      null,
      2
    )
  );
}

try {
  if (command === 'prepare') {
    await prepare();
  } else if (command === 'canvas') {
    await canvas();
  } else if (command === 'trim') {
    await trim();
  } else {
    usage();
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
