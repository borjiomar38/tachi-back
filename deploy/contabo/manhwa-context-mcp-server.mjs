#!/usr/bin/env node
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_CONTEXT_ROOT = 'docs/manhwa/context';
const DEFAULT_PUBLIC_ROOT = 'docs/manhwa/private';

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      throw new Error(`Unexpected argument: ${value}`);
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

const args = parseArgs(process.argv);
const contextRoot = path.resolve(
  args['context-root'] ||
    process.env.MANHWA_CONTEXT_ROOT ||
    DEFAULT_CONTEXT_ROOT
);
const publicRoot = path.resolve(
  args['public-root'] || process.env.MANHWA_PUBLIC_ROOT || DEFAULT_PUBLIC_ROOT
);

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback = {}) {
  if (!(await pathExists(filePath))) {
    return fallback;
  }
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function seriesDir(seriesSlug) {
  return path.join(contextRoot, seriesSlug);
}

function chapterKey(chapterNumber) {
  return String(Number(chapterNumber || 1)).padStart(3, '0');
}

async function loadSeriesContext(seriesSlug, chapterNumber = 1) {
  const dir = seriesDir(seriesSlug);
  const key = chapterKey(chapterNumber);
  return {
    bubbleStyle: await readJson(path.join(dir, 'bubble-style-bible.json')),
    chapter: await readJson(path.join(dir, 'chapters', `chapter-${key}.json`)),
    chapterIndex: await readJson(
      path.join(dir, 'chapters', `chapter-${key}.index.json`)
    ),
    characterAssets: await readJson(path.join(dir, 'characters', 'index.json')),
    characters: await readJson(path.join(dir, 'characters.json'), {
      characters: [],
    }),
    charactersIndex: await readJson(path.join(dir, 'characters.index.json')),
    rootIndex: await readJson(path.join(dir, 'index.json')),
    series: await readJson(path.join(dir, 'series-bible.json')),
  };
}

function findCharacter(context, selector) {
  const query = String(selector || '').toLowerCase();
  const alias = context.charactersIndex?.speakerAliases?.[selector];
  const id = alias || query;
  return (
    context.charactersIndex?.byId?.[id] ||
    asArray(context.characters.characters).find((character) => {
      return (
        String(character.id || '').toLowerCase() === query ||
        String(character.name || '').toLowerCase() === query
      );
    }) ||
    null
  );
}

function panelFromContext(context, panelNumber) {
  const key = String(Number(panelNumber));
  const indexedPanel = context.chapterIndex?.panel_lookup?.[key] || {};
  const chapterPanel =
    asArray(context.chapter.panels).find(
      (panel) => Number(panel.panel_number) === Number(panelNumber)
    ) || {};
  return { ...indexedPanel, ...chapterPanel };
}

function promptReadyPanelContext(context, panelNumber) {
  const panel = panelFromContext(context, panelNumber);
  const characters = asArray(panel.characters_present)
    .map((characterId) => findCharacter(context, characterId))
    .filter(Boolean);

  return {
    background_text: panel.background_text || '',
    bubble_layout_plan: panel.bubble_layout_plan || '',
    bubble_style_bible: context.bubbleStyle,
    characters,
    dialogue: panel.dialogue || [],
    image_prompt_addendum: panel.image_prompt_addendum || '',
    lettering_plan: panel.lettering_plan || '',
    narration: panel.narration || '',
    panel_number: Number(panelNumber),
    top_anchor: panel.top_anchor || '',
    bottom_anchor: panel.bottom_anchor || '',
    visual_continuity_in: panel.visual_continuity_in || '',
    visual_continuity_out: panel.visual_continuity_out || '',
  };
}

async function nextMissingPanel(seriesSlug, chapterNumber) {
  const context = await loadSeriesContext(seriesSlug, chapterNumber);
  const key = chapterKey(chapterNumber);
  for (const panel of asArray(context.chapterIndex.panels)) {
    const panelNumber = Number(panel.panel_number);
    const imagePath = path.join(
      publicRoot,
      seriesSlug,
      `chapter-${key}`,
      `panel-${String(panelNumber).padStart(3, '0')}.png`
    );
    if (!(await pathExists(imagePath))) {
      return promptReadyPanelContext(context, panelNumber);
    }
  }
  return null;
}

function textContent(value) {
  return {
    content: [
      {
        type: 'text',
        text:
          typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

async function toolCall(name, input = {}) {
  const seriesSlug = input.series_slug || 'the-eclipse-crown';
  const chapterNumber = Number(input.chapter_number || 1);
  const context = await loadSeriesContext(seriesSlug, chapterNumber);

  if (name === 'manhwa_context_get') {
    const selector = input.selector || 'index';
    if (selector === 'index') return textContent(context.rootIndex);
    if (selector === 'series') return textContent(context.series);
    if (selector === 'bubble_style') return textContent(context.bubbleStyle);
    if (selector === 'character_assets')
      return textContent(context.characterAssets);
    if (selector === 'characters')
      return textContent(context.charactersIndex || context.characters);
    if (selector === 'chapter')
      return textContent(context.chapterIndex || context.chapter);
    if (selector === 'character') {
      return textContent(
        findCharacter(context, input.character_id || input.speaker)
      );
    }
    if (selector === 'panel') {
      return textContent(
        promptReadyPanelContext(context, input.panel_number || 1)
      );
    }
    throw new Error(`Unknown selector: ${selector}`);
  }

  if (name === 'manhwa_prompt_context') {
    return textContent(
      promptReadyPanelContext(context, input.panel_number || 1)
    );
  }

  if (name === 'manhwa_next_missing_panel') {
    return textContent(await nextMissingPanel(seriesSlug, chapterNumber));
  }

  throw new Error(`Unknown tool: ${name}`);
}

function resourcePath(uri) {
  const match = /^manhwa:\/\/([^/]+)\/(.+)$/.exec(uri);
  if (!match) {
    throw new Error(`Unsupported resource uri: ${uri}`);
  }
  const [, seriesSlug, resource] = match;
  const dir = seriesDir(seriesSlug);
  if (resource === 'index') return path.join(dir, 'index.json');
  if (resource === 'series') return path.join(dir, 'series-bible.json');
  if (resource === 'bubble-style')
    return path.join(dir, 'bubble-style-bible.json');
  if (resource === 'character-assets')
    return path.join(dir, 'characters', 'index.json');
  if (resource === 'characters') return path.join(dir, 'characters.index.json');
  const chapterMatch = /^chapter\/(\d+)(?:\/index)?$/.exec(resource);
  if (chapterMatch) {
    return path.join(
      dir,
      'chapters',
      `chapter-${chapterKey(chapterMatch[1])}.index.json`
    );
  }
  throw new Error(`Unsupported resource uri: ${uri}`);
}

async function handleRequest(message) {
  const { id, method, params = {} } = message;
  if (method === 'initialize') {
    return {
      id,
      jsonrpc: '2.0',
      result: {
        capabilities: {
          resources: {},
          tools: {},
        },
        protocolVersion: params.protocolVersion || '2024-11-05',
        serverInfo: {
          name: 'nayovi-manhwa-context',
          version: '0.1.0',
        },
      },
    };
  }

  if (method === 'notifications/initialized') {
    return null;
  }

  if (method === 'tools/list') {
    return {
      id,
      jsonrpc: '2.0',
      result: {
        tools: [
          {
            name: 'manhwa_context_get',
            description:
              'Return a compact indexed context slice for a Nayovi manhwa series.',
            inputSchema: {
              type: 'object',
              properties: {
                series_slug: { type: 'string' },
                selector: {
                  type: 'string',
                  enum: [
                    'index',
                    'series',
                    'bubble_style',
                    'character_assets',
                    'characters',
                    'chapter',
                    'character',
                    'panel',
                  ],
                },
                chapter_number: { type: 'number' },
                panel_number: { type: 'number' },
                character_id: { type: 'string' },
                speaker: { type: 'string' },
              },
            },
          },
          {
            name: 'manhwa_prompt_context',
            description: 'Return prompt-ready context for one chapter panel.',
            inputSchema: {
              type: 'object',
              properties: {
                series_slug: { type: 'string' },
                chapter_number: { type: 'number' },
                panel_number: { type: 'number' },
              },
              required: ['panel_number'],
            },
          },
          {
            name: 'manhwa_next_missing_panel',
            description:
              'Return prompt-ready context for the next missing panel image.',
            inputSchema: {
              type: 'object',
              properties: {
                series_slug: { type: 'string' },
                chapter_number: { type: 'number' },
              },
            },
          },
        ],
      },
    };
  }

  if (method === 'tools/call') {
    return {
      id,
      jsonrpc: '2.0',
      result: await toolCall(params.name, params.arguments || {}),
    };
  }

  if (method === 'resources/list') {
    return {
      id,
      jsonrpc: '2.0',
      result: {
        resources: [
          ['index', 'Series context index'],
          ['series', 'Series bible'],
          ['bubble-style', 'Bubble and lettering style bible'],
          ['character-assets', 'Character asset folder index'],
          ['characters', 'Character context index'],
          ['chapter/1/index', 'Chapter 1 panel context index'],
        ].map(([resource, name]) => ({
          mimeType: 'application/json',
          name,
          uri: `manhwa://the-eclipse-crown/${resource}`,
        })),
      },
    };
  }

  if (method === 'resources/read') {
    const uri = params.uri;
    const filePath = resourcePath(uri);
    return {
      id,
      jsonrpc: '2.0',
      result: {
        contents: [
          {
            mimeType: 'application/json',
            text: await readFile(filePath, 'utf8'),
            uri,
          },
        ],
      },
    };
  }

  throw new Error(`Unsupported method: ${method}`);
}

function send(message) {
  const payload = JSON.stringify(message);
  process.stdout.write(
    `Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`
  );
}

let buffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  void processBuffer();
});

async function processBuffer() {
  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;
    const header = buffer.slice(0, headerEnd).toString('utf8');
    const match = /Content-Length:\s*(\d+)/i.exec(header);
    if (!match) {
      throw new Error('Missing Content-Length header');
    }
    const length = Number(match[1]);
    const messageStart = headerEnd + 4;
    const messageEnd = messageStart + length;
    if (buffer.length < messageEnd) return;
    const rawMessage = buffer.slice(messageStart, messageEnd).toString('utf8');
    buffer = buffer.slice(messageEnd);
    const message = JSON.parse(rawMessage);
    try {
      const response = await handleRequest(message);
      if (response) send(response);
    } catch (error) {
      send({
        error: {
          code: -32000,
          message: error instanceof Error ? error.message : String(error),
        },
        id: message.id,
        jsonrpc: '2.0',
      });
    }
  }
}
