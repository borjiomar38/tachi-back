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

function parsePanelList(raw, { required = false } = {}) {
  const value = raw.trim();
  if (!value || value === 'none') {
    if (required) {
      throw new Error('Panel list is required.');
    }
    return [];
  }

  const panels = [];
  for (const part of value.split(',')) {
    const token = part.trim();
    if (!token) continue;
    const rangeMatch = token.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1], 10);
      const end = Number.parseInt(rangeMatch[2], 10);
      if (start > end) {
        throw new Error(`Invalid panel range: ${token}`);
      }
      for (let panel = start; panel <= end; panel += 1) panels.push(panel);
      continue;
    }

    const panel = Number.parseInt(token, 10);
    if (!Number.isInteger(panel) || panel <= 0) {
      throw new Error(`Invalid panel number: ${token}`);
    }
    panels.push(panel);
  }

  return [...new Set(panels)].sort((a, b) => a - b);
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

function topFadeSvg(width, height, opacity) {
  return Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#010104" stop-opacity="${opacity}"/>
      <stop offset="42%" stop-color="#030406" stop-opacity="${opacity * 0.58}"/>
      <stop offset="78%" stop-color="#050508" stop-opacity="${opacity * 0.22}"/>
      <stop offset="100%" stop-color="#050508" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="smoke" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#151720" stop-opacity="${opacity * 0.18}"/>
      <stop offset="58%" stop-color="#07080c" stop-opacity="${opacity * 0.08}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#fade)"/>
  <rect width="100%" height="100%" fill="url(#smoke)"/>
</svg>`);
}

function bottomFadeSvg(width, height, opacity) {
  return Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050508" stop-opacity="0"/>
      <stop offset="18%" stop-color="#050508" stop-opacity="${opacity * 0.22}"/>
      <stop offset="30%" stop-color="#040406" stop-opacity="${opacity * 0.56}"/>
      <stop offset="40%" stop-color="#020203" stop-opacity="${opacity * 0.92}"/>
      <stop offset="48%" stop-color="#000000" stop-opacity="${opacity}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="${opacity}"/>
    </linearGradient>
    <radialGradient id="smoke-left" cx="18%" cy="78%" r="70%">
      <stop offset="0%" stop-color="#181a22" stop-opacity="${opacity * 0.22}"/>
      <stop offset="68%" stop-color="#090a10" stop-opacity="${opacity * 0.08}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="smoke-right" cx="82%" cy="72%" r="70%">
      <stop offset="0%" stop-color="#151720" stop-opacity="${opacity * 0.2}"/>
      <stop offset="66%" stop-color="#07080c" stop-opacity="${opacity * 0.08}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#fade)"/>
  <rect width="100%" height="100%" fill="url(#smoke-left)"/>
  <rect width="100%" height="100%" fill="url(#smoke-right)"/>
</svg>`);
}

async function main() {
  const chapterDir = readFlag('--chapter-dir', DEFAULT_CHAPTER_DIR);
  const backupRoot = readFlag('--backup-root', DEFAULT_BACKUP_ROOT);
  const bottomPanels = parsePanelList(readFlag('--bottom-panels', ''), {
    required: false,
  });
  const topPanels = parsePanelList(readFlag('--top-panels', ''), {
    required: false,
  });
  const maxHeight = Math.round(readNumberFlag('--max-height', 320));
  const heightRatio = readNumberFlag('--height-ratio', 0.15);
  const bottomOpacity = Math.min(readNumberFlag('--bottom-opacity', 0.98), 1);
  const topOpacity = Math.min(readNumberFlag('--top-opacity', 0.62), 1);
  const dryRun = hasFlag('--dry-run');

  if (!bottomPanels.length && !topPanels.length) {
    throw new Error(
      'Provide --bottom-panels, --top-panels, or both. Use "none" to skip one side.'
    );
  }

  const allPanels = [...new Set([...bottomPanels, ...topPanels])].sort(
    (a, b) => a - b
  );
  const topPanelSet = new Set(topPanels);
  const bottomPanelSet = new Set(bottomPanels);
  const backupDir = path.join(backupRoot, `smoky-transitions-${stamp()}`);
  const fixed = [];
  const skipped = [];

  if (!dryRun) {
    await fs.mkdir(backupDir, { recursive: true });
  }

  for (const panelNumber of allPanels) {
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

    const fadeHeight = Math.max(
      120,
      Math.min(maxHeight, Math.round(metadata.height * heightRatio))
    );
    const composites = [];
    const applied = [];

    if (topPanelSet.has(panelNumber)) {
      composites.push({
        input: topFadeSvg(metadata.width, fadeHeight, topOpacity),
        left: 0,
        top: 0,
        blend: 'over',
      });
      applied.push('top');
    }

    if (bottomPanelSet.has(panelNumber)) {
      composites.push({
        input: bottomFadeSvg(metadata.width, fadeHeight, bottomOpacity),
        left: 0,
        top: metadata.height - fadeHeight,
        blend: 'over',
      });
      applied.push('bottom');
    }

    const backupPath = path.join(backupDir, path.basename(source));
    const tmpPath = `${source}.smoky-transitions.tmp`;

    if (!dryRun) {
      await fs.copyFile(source, backupPath);
      await sharp(source).composite(composites).png().toFile(tmpPath);
      await fs.rename(tmpPath, source);
      await fs.chmod(source, 0o664).catch(() => {});
    }

    fixed.push({
      panel_number: panelNumber,
      source,
      backup: dryRun ? null : backupPath,
      applied,
      fade_height: fadeHeight,
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
