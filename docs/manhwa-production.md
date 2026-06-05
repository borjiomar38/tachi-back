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
recorded in `chapter-001-images.json`. The cron also writes a private
`render-status.json` marker in the same chapter folder so the Dockerized admin
backoffice can show whether the host-side renderer is running, idle, failed, or
daily-limit blocked. Draft images must not be written under `public/`; admin
preview reads them through the protected
`/api/manhwa-private/...` route. The backend must still not call OpenAI image
APIs for Nayovi Originals images.

On Contabo, the app container reads private manhwa images from
`MANHWA_PRIVATE_ROOT=/app/docs/manhwa/private`. Docker mounts that path from the
host directory `${TACHI_MANHWA_PRIVATE_DIR:-/opt/tachi-back/docs/manhwa/private}`
as read-only, so cron-rendered panels become visible to the admin preview after
generation without copying them into the image build.

## Daily Panel Cron

The chapter image cron renders exactly the next missing approved panel image and
then stops. `MANHWA_IMAGE_RUN_LIMIT=1` keeps each execution to one panel, while
`MANHWA_IMAGE_DAILY_LIMIT=12` caps the total panels rendered in one server-local
day. Running the cron every two hours gives the first chapter room to finish
faster without letting one execution consume the whole queue.

Install on Contabo from the deployed source tree:

```bash
cd /opt/tachi-back
sudo install -m 0755 deploy/contabo/generate-codex-image.sh /usr/local/bin/tachi-codex-image-generator
sudo install -m 0755 deploy/contabo/run-manhwa-preproduction-task.py /usr/local/bin/tachi-manhwa-preproduction-task
sudo install -m 0755 deploy/contabo/build-manhwa-character-assets.mjs /usr/local/bin/tachi-manhwa-character-assets
sudo install -m 0755 deploy/contabo/build-manhwa-context-index.mjs /usr/local/bin/tachi-manhwa-context-index
sudo install -m 0755 deploy/contabo/manhwa-context-mcp-server.mjs /usr/local/bin/tachi-manhwa-context-mcp
sudo install -m 0755 deploy/contabo/render-manhwa-character-references.py /usr/local/bin/tachi-manhwa-character-references
sudo install -m 0755 deploy/contabo/render-manhwa-chapter-images.py /usr/local/bin/tachi-manhwa-image-renderer
sudo install -m 0755 deploy/contabo/build-manhwa-copyright-package.py /usr/local/bin/tachi-manhwa-copyright-package
sudo install -m 0755 deploy/contabo/run-manhwa-preproduction-cron.sh /usr/local/bin/tachi-manhwa-preproduction-cron
sudo install -m 0755 deploy/contabo/run-manhwa-character-reference-cron.sh /usr/local/bin/tachi-manhwa-character-reference-cron
sudo install -m 0755 deploy/contabo/run-manhwa-image-cron.sh /usr/local/bin/tachi-manhwa-image-cron
sudo install -m 0755 deploy/contabo/run-manhwa-copyright-cron.sh /usr/local/bin/tachi-manhwa-copyright-cron
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
MANHWA_PREPRODUCTION_RUNNER_PATH=/usr/local/bin/tachi-manhwa-preproduction-task
MANHWA_PREPRODUCTION_CODEX_MODEL=gpt-5.5
MANHWA_PREPRODUCTION_CODEX_REASONING_EFFORT=extra-high
MANHWA_PREPRODUCTION_TASK_TYPE=auto
MANHWA_PREPRODUCTION_DRY_RUN=false
MANHWA_CHARACTER_ASSET_BUILDER_PATH=/usr/local/bin/tachi-manhwa-character-assets
MANHWA_CONTEXT_INDEXER_PATH=/usr/local/bin/tachi-manhwa-context-index
MANHWA_CHARACTER_REFERENCE_RENDERER_PATH=/usr/local/bin/tachi-manhwa-character-references
MANHWA_IMAGE_RENDERER_PATH=/usr/local/bin/tachi-manhwa-image-renderer
MANHWA_COPYRIGHT_BUILDER_PATH=/usr/local/bin/tachi-manhwa-copyright-package
MANHWA_IMAGE_SCRIPT_PATH=/usr/local/bin/tachi-codex-image-generator
MANHWA_CONTEXT_DIR=docs/manhwa/context/the-eclipse-crown
MANHWA_CHARACTER_REFERENCE_DAILY_LIMIT=1
MANHWA_CHARACTER_REFERENCE_REQUIRE_DOSSIERS=true
MANHWA_CHARACTER_REFERENCE_DRY_RUN=false
MANHWA_CHARACTER_REFERENCE_FORCE=false
MANHWA_IMAGE_DAILY_LIMIT=12
MANHWA_IMAGE_RUN_LIMIT=1
MANHWA_IMAGE_REQUIRE_PREPRODUCTION=true
MANHWA_IMAGE_REQUIRE_CHARACTER_REFERENCES=true
MANHWA_IMAGE_ALLOW_UNAPPROVED=false
MANHWA_IMAGE_FORCE=false
CODEX_IMAGE_CODEX_MODEL=gpt-5.5
CODEX_IMAGE_CODEX_REASONING_EFFORT=low
CODEX_IMAGE_MIN_WIDTH=900
CODEX_IMAGE_MIN_HEIGHT=1200
MANHWA_COPYRIGHT_SERIES_SLUG=the-eclipse-crown
MANHWA_COPYRIGHT_CHAPTER_NUMBER=1
MANHWA_COPYRIGHT_SCOPE=auto
MANHWA_COPYRIGHT_OUTPUT_ROOT=docs/manhwa/copyright
MANHWA_COPYRIGHT_ALLOW_INCOMPLETE=true
MANHWA_COPYRIGHT_APPEND_QUEUE=true
MANHWA_COPYRIGHT_PAID_FILING_INTENT=false
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
35 0 * * * TACHI_APP_DIR=/opt/tachi-back MANHWA_AGENT_ENV_FILE=/opt/tachi-back/.env.manhwa-production /usr/local/bin/tachi-manhwa-preproduction-cron >> /var/log/tachi-manhwa-preproduction-cron.log 2>&1
05 1 * * * TACHI_APP_DIR=/opt/tachi-back MANHWA_AGENT_ENV_FILE=/opt/tachi-back/.env.manhwa-production /usr/local/bin/tachi-manhwa-character-reference-cron >> /var/log/tachi-manhwa-character-reference-cron.log 2>&1
45 */2 * * * TACHI_APP_DIR=/opt/tachi-back MANHWA_AGENT_ENV_FILE=/opt/tachi-back/.env.manhwa-production /usr/local/bin/tachi-manhwa-image-cron >> /var/log/tachi-manhwa-image-cron.log 2>&1
45 2 * * * TACHI_APP_DIR=/opt/tachi-back MANHWA_AGENT_ENV_FILE=/opt/tachi-back/.env.manhwa-production /usr/local/bin/tachi-manhwa-copyright-cron >> /var/log/tachi-manhwa-copyright-cron.log 2>&1
```

During the first days, production is intentionally not panel-first. The
preproduction cron consumes the creative lane in this order:

1. Day 1: build the series story engine and originality guardrails.
2. Day 2: build the 120-chapter season scenario map.
3. Next days: build one full character dossier per day, with voice, psychology,
   visual locks, bubble rules, scenario hooks, forbidden drift, and a unique
   reference image plan for that character.
4. Then: build the chapter scenario.
5. Then: generate character reference images.
6. Then: generate one finished chapter panel image per run, capped at 12 per
   day.

The character reference cron refuses to run while character dossiers are
missing. The panel cron refuses to run until preproduction is ready and
`characters/index.json` reports zero missing references. This prevents a single
generic character prompt from driving the whole manhwa and keeps scenarios
managed before chapters are rendered.

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

## Copyright Package Automation

The copyright cron prepares a private package after nightly production. Default
mode is free evidence/provenance only. It does not submit, pay, or certify an
official copyright application, and `MANHWA_COPYRIGHT_PAID_FILING_INTENT=false`
keeps official filing readiness disabled. Official paid filing remains only an
optional future admin decision because the U.S. Copyright Office application
needs legal statements, deposit choices, payment, and certification.

For each new series, run the package builder without `--chapter-number` to
create a series-bible/treatment package:

```bash
/usr/local/bin/tachi-manhwa-copyright-package \
  --series-slug the-eclipse-crown \
  --scope series
```

For each chapter, run it with the chapter number:

```bash
/usr/local/bin/tachi-manhwa-copyright-package \
  --series-slug the-eclipse-crown \
  --chapter-number 1 \
  --allow-incomplete
```

Outputs are written under `docs/manhwa/copyright/` and must stay private:

- `work-deposit.zip`: reader-safe deposit package for admin review.
- `evidence.zip`: private provenance package with source JSON, context, hashes,
  git commit, prompt/originality records, and manifests.
- `usco-application-draft.json`: filing draft and AI-authorship disclaimer
  prompts for the admin to review.
- `filing-checklist.md`: human filing checklist.
- `copyright-action-queue.jsonl`: private queue of packages needing admin
  review/submission.

The chapter package marks `filing_ready=false` while planned panel images are
missing or the chapter is not approved/published. This allows daily evidence
snapshots without pretending an incomplete chapter is ready for official filing.
The series package covers only the fixed series bible/treatment currently in
the deposit; it does not cover future unwritten chapters.

For the normal no-payment workflow, use the generated package as proof that
Nayovi had the fixed expression first:

- `package-summary.json` records generation time and package hashes.
- `evidence/evidence-manifest.json` records git commit and source paths.
- `evidence/hashes.sha256` records exact SHA-256 hashes for the package files.
- `work-deposit.zip` is the reader-safe copy of the chapter/treatment.
- `evidence.zip` is private provenance for disputes, takedowns, and ownership
  claims.

Official sources to review before filing:

- U.S. Copyright Office registration portal: https://www.copyright.gov/registration/
- U.S. Copyright Office AI initiative: https://www.copyright.gov/ai/
- AI registration guidance PDF: https://www.copyright.gov/ai/ai_policy_guidance.pdf
- Group Registration of Unpublished Works: https://www.copyright.gov/gruw/
