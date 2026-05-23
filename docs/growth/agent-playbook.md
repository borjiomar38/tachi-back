# Nayovi Growth Agent Playbook

The growth agent runs on the Contabo VPS and uses Codex to work in controlled cycles.

## Priorities

1. Improve technical SEO and conversion paths on `tachiyomiat.com`.
2. Build white-hat backlinks through relevant directories, resource pages, guest posts, and partnerships.
3. Prepare personalized outreach for agencies, creators, communities, affiliates, and investors.
4. Track every cycle in `docs/growth/growth-log.md`.

## Safety Rules

- Never push or merge `master`; that branch deploys production.
- Never run manual Vercel production deploy commands.
- Never buy links, use PBNs, spam public comments, scrape private contact data, or evade platform limits.
- Send email only when a prospect is explicitly approved and server env allows sending.
- Keep outreach specific, short, and useful, with an opt-out line.

## Operating Files

- `docs/growth/backlink-prospects.csv`: backlink and partnership target list.
- `docs/growth/outreach-drafts.md`: reusable but personalized email drafts.
- `docs/growth/growth-log.md`: cycle reports and next actions.

## Recommended Cycle

1. Audit site/indexing/content/conversion gaps.
2. Add or refine one small SEO or conversion improvement.
3. Add 5-15 high-relevance prospects.
4. Draft 2-5 outreach messages.
5. Validate locally where practical.
6. Commit to `growth/autonomous`.
7. Push the branch only when enabled.
