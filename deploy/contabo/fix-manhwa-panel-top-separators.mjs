#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const DEFAULT_CHAPTER_DIR = 'docs/manhwa/private/the-eclipse-crown/chapter-001';
const DEFAULT_BACKUP_ROOT =
  'docs/manhwa/private-backups/the-eclipse-crown/chapter-001';

function readFlag(name, fallback = '') {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value.`);
  }
  return value;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readPanels() {
  const raw = readFlag('--panels', '');
  if (!raw) {
    throw new Error('--panels is required, for example --panels 2,3,4');
  }
  const panels = raw
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);
  if (!panels.length) {
    throw new Error(
      '--panels must contain at least one positive panel number.'
    );
  }
  return [...new Set(panels)].sort((a, b) => a - b);
}

function readCropTop() {
  const raw = readFlag('--crop-top', '80');
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('--crop-top must be a positive integer.');
  }
  return value;
}

function panelPath(chapterDir, panelNumber) {
  return path.join(
    chapterDir,
    `panel-${String(panelNumber).padStart(3, '0')}.png`
  );
}

function stamp() {
  return new Date()
    .toISOString()
    .replaceAll(/[-:]/g, '')
    .replace(/\.\d+Z$/, 'Z');
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const chapterDir = readFlag('--chapter-dir', DEFAULT_CHAPTER_DIR);
  const backupRoot = readFlag('--backup-root', DEFAULT_BACKUP_ROOT);
  const panels = readPanels();
  const cropTop = readCropTop();
  const dryRun = hasFlag('--dry-run');
  const backupDir = path.join(backupRoot, `top-separator-fix-${stamp()}`);
  const fixed = [];
  const skipped = [];

  if (!dryRun) {
    await fs.mkdir(backupDir, { recursive: true });
  }

  for (const panelNumber of panels) {
    const source = panelPath(chapterDir, panelNumber);
    if (!(await pathExists(source))) {
      skipped.push({
        panel_number: panelNumber,
        reason: 'missing_file',
        source,
      });
      continue;
    }

    const metadata = await sharp(source).metadata();
    if (!metadata.width || !metadata.height) {
      skipped.push({
        panel_number: panelNumber,
        reason: 'invalid_png',
        source,
      });
      continue;
    }
    if (metadata.height <= cropTop + 200) {
      skipped.push({
        panel_number: panelNumber,
        reason: 'crop_too_large',
        source,
      });
      continue;
    }

    const backupPath = path.join(backupDir, path.basename(source));
    const tmpPath = `${source}.top-separator-fix.tmp`;
    const nextHeight = metadata.height - cropTop;

    if (!dryRun) {
      await fs.copyFile(source, backupPath);
      await sharp(source)
        .extract({
          left: 0,
          top: cropTop,
          width: metadata.width,
          height: nextHeight,
        })
        .png()
        .toFile(tmpPath);
      await fs.rename(tmpPath, source);
      await fs.chmod(source, 0o664).catch(() => {});
    }

    fixed.push({
      panel_number: panelNumber,
      source,
      backup: dryRun ? null : backupPath,
      crop_top: cropTop,
      before: { width: metadata.width, height: metadata.height },
      after: { width: metadata.width, height: nextHeight },
    });
  }

  const report = {
    backup_dir: dryRun ? null : backupDir,
    crop_top: cropTop,
    dry_run: dryRun,
    fixed,
    skipped,
  };

  console.log(JSON.stringify(report, null, 2));

  if (!fixed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
