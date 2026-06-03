# Nayovi Originals Production

The manhwa production workflow is separate from SEO, blog, Facebook, and translation agents.

## Model Scope

- Creative story package: `gpt-5.5`
- Creative reasoning effort: `xhigh` in Codex CLI config. Owner-facing alias: `extra-high`.
- Use only for Nayovi Originals story, character, chapter, panel prompt, and expert review work.
- Do not reuse this model setting for the SEO distribution agent, blog cron, Facebook post agent, or Tachiback translation.

## Autonomous Gate

Owner approval is not part of normal nightly publishing. The gate is an autonomous expert AI review that checks:

- story hook and reader momentum,
- long-series scalability,
- recurring character consistency,
- panel continuity,
- copyright and originality risk,
- image prompt quality,
- publication readiness.

If the expert review is not approved, the nightly job should revise or hold the chapter without publishing.

## Current Command

```bash
MANHWA_CREATIVE_CODEX_MODEL=gpt-5.5 \
MANHWA_CREATIVE_CODEX_REASONING_EFFORT=extra-high \
python3 deploy/contabo/generate-manhwa-chapter.py \
  --series-title "THE ECLIPSE CROWN" \
  --series-slug the-eclipse-crown \
  --chapter-number 1
```

Generated chapter packages are written to `docs/manhwa/generated/`.

Stable series context is stored separately under
`docs/manhwa/context/<series-slug>/`. That folder contains character canon,
scenario context, and the bubble/lettering style bible used by image rendering.
Fast lookup indexes are generated beside the context files so agents do not need
to analyze the full story bible for every panel.

The autonomous gate revises up to `MANHWA_AGENT_MAX_REVISIONS` times when the expert AI rejects a chapter. A chapter is production-ready only when `publication_status` is `approved_by_expert_ai`.

Chapter packages currently target exactly 12 vertical panels for reliable nightly generation.

## Character Preproduction

Before regular chapter panel generation, the first production days should build
recurring character folders and generate reference images. Each character has a
folder under `docs/manhwa/context/<series-slug>/characters/<character-id>/` with:

- `profile.json`: canon identity, bubble rules, visual lock rules.
- `reference-plan.json`: required reference images to generate.
- `pose-bank.json`: reusable body, face, action, and chapter-specific poses.
- `index.json`: fast lookup with generated/missing reference status.

The matching draft image folder is
`docs/manhwa/private/<series-slug>/characters/<character-id>/`.

Refresh folders and indexes:

```bash
node deploy/contabo/build-manhwa-character-assets.mjs \
  --series-slug the-eclipse-crown

node deploy/contabo/build-manhwa-context-index.mjs \
  --series-slug the-eclipse-crown \
  --chapter-number 1
```

Generate the next missing character reference image:

```bash
python3 deploy/contabo/render-manhwa-character-references.py \
  --series-slug the-eclipse-crown \
  --limit 1
```

The normal chapter image cron is configured to refuse panel rendering while
required character references are missing. This keeps Elianor, Caelan, the
Eclipse Crown, and later recurring characters visually stable instead of
changing face, body, costume, or bubble style between panels.

## Image Rendering

Approved chapter packages can be rendered through Codex CLI imagegen only:

```bash
MANHWA_IMAGE_SCRIPT_PATH=/usr/local/bin/tachi-codex-image-generator \
python3 deploy/contabo/render-manhwa-chapter-images.py \
  --package-file docs/manhwa/generated/the-eclipse-crown-chapter-001.json
```

The renderer refuses unapproved packages unless `--allow-unapproved` is passed
for a local smoke test. It writes draft panel images under
`docs/manhwa/private/<series-slug>/chapter-XXX/` with narration captions and
character-owned dialogue bubbles generated directly in the image. Outputs are
recorded in `chapter-001-images.json`. Draft images must not be written under
`public/`; admin preview reads them through the protected
`/api/manhwa-private/...` route. The backend must still not call OpenAI image
APIs for Nayovi Originals images.

## Daily Panel Cron

The chapter image cron renders exactly the next missing approved panel image and
then stops. This keeps production predictable: one new panel image per day.

Install on Contabo from the deployed source tree:

```bash
cd /opt/tachi-back
sudo install -m 0755 deploy/contabo/generate-codex-image.sh /usr/local/bin/tachi-codex-image-generator
sudo install -m 0755 deploy/contabo/build-manhwa-character-assets.mjs /usr/local/bin/tachi-manhwa-character-assets
sudo install -m 0755 deploy/contabo/build-manhwa-context-index.mjs /usr/local/bin/tachi-manhwa-context-index
sudo install -m 0755 deploy/contabo/manhwa-context-mcp-server.mjs /usr/local/bin/tachi-manhwa-context-mcp
sudo install -m 0755 deploy/contabo/render-manhwa-character-references.py /usr/local/bin/tachi-manhwa-character-references
sudo install -m 0755 deploy/contabo/render-manhwa-chapter-images.py /usr/local/bin/tachi-manhwa-image-renderer
sudo install -m 0755 deploy/contabo/run-manhwa-character-reference-cron.sh /usr/local/bin/tachi-manhwa-character-reference-cron
sudo install -m 0755 deploy/contabo/run-manhwa-image-cron.sh /usr/local/bin/tachi-manhwa-image-cron
```

Suggested env file at `/opt/tachi-back/.env.manhwa-production`:

```env
MANHWA_IMAGE_PACKAGE_FILE=docs/manhwa/generated/the-eclipse-crown-chapter-001.json
MANHWA_IMAGE_OUTPUT_ROOT=docs/manhwa/private
MANHWA_SERIES_SLUG=the-eclipse-crown
MANHWA_CHAPTER_NUMBER=1
MANHWA_CONTEXT_ROOT=docs/manhwa/context
MANHWA_PACKAGE_ROOT=docs/manhwa/generated
MANHWA_PUBLIC_ROOT=docs/manhwa/private
MANHWA_CHARACTER_ASSET_BUILDER_PATH=/usr/local/bin/tachi-manhwa-character-assets
MANHWA_CONTEXT_INDEXER_PATH=/usr/local/bin/tachi-manhwa-context-index
MANHWA_CHARACTER_REFERENCE_RENDERER_PATH=/usr/local/bin/tachi-manhwa-character-references
MANHWA_IMAGE_RENDERER_PATH=/usr/local/bin/tachi-manhwa-image-renderer
MANHWA_IMAGE_SCRIPT_PATH=/usr/local/bin/tachi-codex-image-generator
MANHWA_CONTEXT_DIR=docs/manhwa/context/the-eclipse-crown
MANHWA_CHARACTER_REFERENCE_DAILY_LIMIT=1
MANHWA_CHARACTER_REFERENCE_DRY_RUN=false
MANHWA_CHARACTER_REFERENCE_FORCE=false
MANHWA_IMAGE_DAILY_LIMIT=1
MANHWA_IMAGE_REQUIRE_CHARACTER_REFERENCES=true
MANHWA_IMAGE_ALLOW_UNAPPROVED=false
MANHWA_IMAGE_FORCE=false
CODEX_IMAGE_CODEX_MODEL=gpt-5.5
CODEX_IMAGE_CODEX_REASONING_EFFORT=low
CODEX_IMAGE_MIN_WIDTH=900
CODEX_IMAGE_MIN_HEIGHT=1200
```

Rebuild fast context indexes after changing story context or chapter packages:

```bash
cd /opt/tachi-back
/usr/local/bin/tachi-manhwa-context-index --series-slug the-eclipse-crown --chapter-number 1
```

Optional MCP command for Codex or other local agents:

```bash
/usr/local/bin/tachi-manhwa-context-mcp --context-root /opt/tachi-back/docs/manhwa/context
```

Useful MCP tools exposed:

- `manhwa_context_get`: compact slices such as series, characters, panel, or bubble style.
- `manhwa_prompt_context`: prompt-ready context for one panel.
- `manhwa_next_missing_panel`: prompt-ready context for the next missing image.

Cron entry:

```cron
05 1 * * * TACHI_APP_DIR=/opt/tachi-back MANHWA_AGENT_ENV_FILE=/opt/tachi-back/.env.manhwa-production /usr/local/bin/tachi-manhwa-character-reference-cron >> /var/log/tachi-manhwa-character-reference-cron.log 2>&1
15 2 * * * TACHI_APP_DIR=/opt/tachi-back MANHWA_AGENT_ENV_FILE=/opt/tachi-back/.env.manhwa-production /usr/local/bin/tachi-manhwa-image-cron >> /var/log/tachi-manhwa-image-cron.log 2>&1
```

During the first days, the character reference cron will consume the nightly
image slot by generating one missing reference image per run. The panel cron can
stay scheduled: with `MANHWA_IMAGE_REQUIRE_CHARACTER_REFERENCES=true`, it exits
without rendering chapter panels until `characters/index.json` reports zero
missing references.

The cron intentionally renders `panel-XXX.png` as a finished manhwa image, not
an HTML text overlay. It remains a private draft until the whole chapter is
complete and explicitly promoted. The image prompt includes a bubble ownership
plan: which character owns each bubble, the exact line to render, the type of
bubble, and where the tail or thought dots should point. It also includes a
lettering plan for creative but readable manhwa typography and an optional
background/location caption such as a place or time marker when that helps the
scene.

Public publication rule: a chapter remains private until every planned panel
image exists and the chapter status is changed to `published`. Before that,
only an authenticated `admin` role can see progress. Do not expose incomplete
chapter panels under `public/manhwa`.

The current accepted bubble style must stay coherent across the chapter:
narration uses black gothic title-card boxes with ivory/silver ornament borders;
supernatural thoughts use warm ivory oval/circular bubbles with decorative
black-silver rings, moonlit glow, and thought-dot chains; normal dialogue uses
white/ivory manhwa bubbles with inked outlines, natural tails, subtle paper
texture, and readable serif lettering.

## Senior AI Visual Gate

After image generation, the autonomous expert AI gate should validate the final
published panel image against the complete package context:

- the visual beat matches the scenario and panel prompt,
- recurring characters match the character registry,
- captions and dialogue are legible and placed like manhwa bubbles,
- lettering is attractive, visible on mobile, and integrated into the art,
- bubble/caption styling remains coherent with the accepted series style bible,
- any background/location text is useful, short, and accurate,
- generated text matches the scenario closely enough, with no confusing fake
  text, accidental logos, or watermarks,
- the panel continues correctly from previous and next panels.

If the gate fails, the nightly job should regenerate the panel instead of asking
the owner to approve a draft.
