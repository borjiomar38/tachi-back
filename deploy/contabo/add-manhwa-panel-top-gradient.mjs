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
    throw new Error(
      '--panels is required, for example --panels 2-12 or --panels 2,3,4'
    );
  }

  const panels = [];
  for (const part of raw.split(',')) {
    const value = part.trim();
    if (!value) continue;
    const rangeMatch = value.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      for (let panel = start; panel <= end; panel += 1) panels.push(panel);
      continue;
    }
    const panel = Number.parseInt(value, 10);
    if (Number.isInteger(panel) && panel > 0) panels.push(panel);
  }

  const uniquePanels = [...new Set(panels)].sort((a, b) => a - b);
  if (!uniquePanels.length) {
    throw new Error(
      '--panels must contain at least one positive panel number.'
    );
  }
  return uniquePanels;
}

function readNumberFlag(name, fallback) {
  const value = Number.parseFloat(readFlag(name, String(fallback)));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number.`);
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

function topGradientSvg(width, height, opacity) {
  return Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020205" stop-opacity="${opacity}"/>
      <stop offset="38%" stop-color="#040507" stop-opacity="${opacity * 0.58}"/>
      <stop offset="72%" stop-color="#050507" stop-opacity="${opacity * 0.22}"/>
      <stop offset="100%" stop-color="#050507" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="mist" cx="50%" cy="0%" r="90%">
      <stop offset="0%" stop-color="#11131a" stop-opacity="${opacity * 0.18}"/>
      <stop offset="60%" stop-color="#0a0b10" stop-opacity="${opacity * 0.06}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#fade)"/>
  <rect width="100%" height="100%" fill="url(#mist)"/>
</svg>`);
}

async function main() {
  const chapterDir = readFlag('--chapter-dir', DEFAULT_CHAPTER_DIR);
  const backupRoot = readFlag('--backup-root', DEFAULT_BACKUP_ROOT);
  const panels = readPanels();
  const maxGradientHeight = Math.round(readNumberFlag('--max-height', 180));
  const heightRatio = readNumberFlag('--height-ratio', 0.11);
  const opacity = Math.min(readNumberFlag('--opacity', 0.72), 1);
  const dryRun = hasFlag('--dry-run');
  const backupDir = path.join(backupRoot, `top-gradient-${stamp()}`);
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

    const gradientHeight = Math.max(
      96,
      Math.min(maxGradientHeight, Math.round(metadata.height * heightRatio))
    );
    const backupPath = path.join(backupDir, path.basename(source));
    const tmpPath = `${source}.top-gradient.tmp`;
    const overlay = topGradientSvg(metadata.width, gradientHeight, opacity);

    if (!dryRun) {
      await fs.copyFile(source, backupPath);
      await sharp(source)
        .composite([{ input: overlay, left: 0, top: 0, blend: 'over' }])
        .png()
        .toFile(tmpPath);
      await fs.rename(tmpPath, source);
      await fs.chmod(source, 0o664).catch(() => {});
    }

    fixed.push({
      panel_number: panelNumber,
      source,
      backup: dryRun ? null : backupPath,
      gradient_height: gradientHeight,
      opacity,
      dimensions: { width: metadata.width, height: metadata.height },
    });
  }

  console.log(
    JSON.stringify(
      {
        backup_dir: dryRun ? null : backupDir,
        dry_run: dryRun,
        fixed,
        skipped,
      },
      null,
      2
    )
  );

  if (!fixed.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
