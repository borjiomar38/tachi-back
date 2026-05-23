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
- When `GROWTH_AGENT_AUTONOMOUS_PROSPECT_APPROVAL_ENABLED=true`, approve prospects autonomously using human business judgment. A prospect is ready when the contact path is public/official, the fit with Nayovi is clear, and the message can be personalized with a useful reason.
- Send outreach when `GROWTH_AGENT_AUTONOMOUS_OUTREACH_ENABLED=true`, `GROWTH_AGENT_EMAIL_SEND_MODE=send`, and the prospect passes the autonomous approval criteria. Do not wait for owner approval for normal backlink, app directory, reviewer, partnership, or investor-intro outreach.
- Keep outreach specific, short, and useful, with an opt-out line.
- Use `/usr/local/bin/tachi-growth-outreach-send` for email outreach so daily caps and delivery logs are enforced. For official web forms, log the form URL, submitted text, and rationale.

## Operating Files

- `docs/growth/backlink-prospects.csv`: backlink and partnership target list.
- `docs/growth/outreach-drafts.md`: reusable but personalized email drafts.
- `docs/growth/growth-log.md`: cycle reports and next actions.

## Recommended Cycle

1. Audit site/indexing/content/conversion gaps.
2. Add or refine one small SEO or conversion improvement.
3. Add 5-15 high-relevance prospects.
4. Autonomously approve the top ready prospects by changing status to `auto_approved`.
5. Send or submit 1-5 high-fit outreach actions within the daily cap, then mark contacted prospects as `contacted`.
6. Draft 2-5 reusable outreach messages for prospects that are not ready yet.
7. Validate locally where practical.
8. Commit to the cycle branch.
9. Push the branch only when enabled; the runner handles publishing.
