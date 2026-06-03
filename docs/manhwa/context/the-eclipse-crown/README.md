# THE ECLIPSE CROWN Context

This folder is the stable production context used by Nayovi Originals agents.
Generated chapter packages may change, but this context preserves the series
identity, character visual continuity, lettering style, and bubble rules.

## Files

- `series-bible.json`: permanent story identity and visual promise.
- `characters.json`: recurring character canon plus per-character bubble rules.
- `characters/<character-id>/profile.json`: per-character identity lock.
- `characters/<character-id>/reference-plan.json`: planned reference images for that character.
- `characters/<character-id>/pose-bank.json`: stable poses and body/action continuity notes.
- `characters/<character-id>/index.json`: fast local lookup for that character folder.
- `characters/index.json`: global character asset index with generated/missing reference status.
- `bubble-style-bible.json`: global caption, speech, thought, and background text style.
- `chapters/chapter-001.json`: approved chapter scenario context and panel-level text direction.
- `index.json`: compact lookup map for MCP and cron agents.
- `characters.index.json`: fast character/speaker lookup.
- `chapters/chapter-001.index.json`: fast panel, bubble, and vertical continuity lookup.

Image generation should load this context before rendering panels so bubbles,
fonts, character ownership, and background story text remain coherent across the
whole chapter.

Before regular chapter images continue, generate the recurring character
reference images from these folders. The daily panel cron is expected to stop
while `characters/index.json` still reports missing required references.

Build or refresh character folders:

```bash
node deploy/contabo/build-manhwa-character-assets.mjs \
  --series-slug the-eclipse-crown
```

Generate one missing reference image:

```bash
python3 deploy/contabo/render-manhwa-character-references.py \
  --series-slug the-eclipse-crown \
  --limit 1
```

Rebuild indexes after changing context or chapter packages:

```bash
node deploy/contabo/build-manhwa-context-index.mjs \
  --series-slug the-eclipse-crown \
  --chapter-number 1
```

Local MCP server:

```bash
node deploy/contabo/manhwa-context-mcp-server.mjs \
  --context-root docs/manhwa/context
```
