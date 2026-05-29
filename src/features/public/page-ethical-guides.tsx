import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  FileCheck2Icon,
  LanguagesIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { androidApkDownload } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

const setupSteps = [
  {
    icon: SmartphoneIcon,
    title: 'Use official installs',
    description:
      'Download Nayovi from this site and use official Mihon, Tachiyomi, or TachiyomiAT project channels when you need a separate reader. Avoid patched APKs and unknown mirrors.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Keep provider keys off the device',
    description:
      'Hosted OCR and translation requests go through the Nayovi backend, so the Android client does not need user-managed OCR or translation API keys.',
  },
  {
    icon: BookOpenCheckIcon,
    title: 'Bring permission-safe content',
    description:
      'Process only content you own, content in the public domain, creator-provided samples, official previews, or material you have permission to translate.',
  },
  {
    icon: FileCheck2Icon,
    title: 'Use support for recovery',
    description:
      'Redeem-code, payment, installation, and device recovery questions should go through support instead of public extension or source-sharing threads.',
  },
] as const;

const readerLineageNotes = [
  {
    title: 'For TachiyomiAT searches',
    description:
      'Nayovi is the current branded Android APK and hosted translation path for readers who arrive from TachiyomiAT setup or TachiyomiAT download searches.',
  },
  {
    title: 'For Tachiyomi and Mihon readers',
    description:
      'Readers familiar with Tachiyomi or Mihon-style workflows can keep the same Android-first reading habit while using Nayovi for hosted OCR, AI translation, activation, and support.',
  },
  {
    title: 'Keep sources separate',
    description:
      'Use official reader project channels for reader setup and use Nayovi for translation support. Nayovi does not host manga chapters, extension lists, or unauthorized chapter sources.',
  },
] as const;

const workflowSteps = [
  {
    title: '1. Check permission first',
    description:
      'Confirm that the page, sample, or chapter can be processed before uploading it for OCR or translation. Do not use the workflow for licensed rips, paywalled chapters, or unauthorized uploads.',
  },
  {
    title: '2. Prepare clean inputs',
    description:
      'Use readable pages, avoid unnecessary crops, and keep the original context available so reviewers can compare the OCR result against the source material.',
  },
  {
    title: '3. Keep a glossary',
    description:
      'Record character names, place names, technique terms, honorific choices, and recurring UI text so future chapters stay consistent.',
  },
  {
    title: '4. Review before sharing',
    description:
      'A human reviewer should check tone, missing bubbles, mistranslated names, and layout issues before any permission-safe translation note is shared publicly.',
  },
  {
    title: '5. Credit and remove quickly',
    description:
      'Credit contributors where appropriate and keep a clear route for rights holders or creators to request removal, correction, or review.',
  },
] as const;

const ocrChecklistRows = [
  {
    checkpoint: 'Text detection',
    detail:
      'Confirm speech bubbles, narration boxes, vertical text, sound effects, and small UI labels are captured before judging translation quality.',
  },
  {
    checkpoint: 'Reading order',
    detail:
      'Compare the OCR blocks against panel order so short replies, side comments, and long-strip manhwa panels do not get translated out of context.',
  },
  {
    checkpoint: 'Glossary consistency',
    detail:
      'Track names, places, ranks, attacks, honorifics, and recurring terms in one reviewer note before processing another chapter or sample.',
  },
  {
    checkpoint: 'Human review decision',
    detail:
      'Mark whether the result is ready for private reading, needs correction, or should not be shared because permission or source quality is unclear.',
  },
] as const;

const researchCitationRows = [
  {
    label: 'Missing regions',
    detail:
      'Compare detected OCR blocks against the full page so dialogue, captions, sound effects, and small notes are not silently skipped.',
  },
  {
    label: 'Under-segmented balloons',
    detail:
      'Flag bubbles that combine multiple speakers or dialogue turns before sending the text to translation.',
  },
  {
    label: 'Transcription drift',
    detail:
      'Keep the original OCR text visible for reviewer correction when a model reads stylized lettering, vertical text, or low-contrast pages incorrectly.',
  },
  {
    label: 'Research context',
    detail:
      'Recent manga-understanding research has called out transcription errors, missing text regions, overlapping dialogue, onomatopoeia, and under-segmented speech balloons as OCR annotation problems worth checking explicitly.',
  },
] as const;

const transparencyRows = [
  {
    label: 'Human review stays visible',
    detail:
      'Treat AI output as a draft for permitted samples. Keep reviewer notes, corrected OCR text, glossary choices, and unresolved quality issues visible before anyone cites the result.',
  },
  {
    label: 'Do not replace credits',
    detail:
      'If a creator, translator, letterer, editor, or publisher contributed to the sample, keep that credit context attached and avoid presenting machine output as official localization.',
  },
  {
    label: 'Say what was automated',
    detail:
      'When sharing a test, explain whether Nayovi helped with OCR detection, block grouping, translation drafting, glossary review, or Android workflow testing.',
  },
  {
    label: 'Block public sharing when unclear',
    detail:
      'Do not publish translated pages, screenshots, or before-and-after examples when source permission, reviewer approval, or output quality is uncertain.',
  },
] as const;

const technicalEvaluationRows = [
  {
    label: 'Sample manifest',
    detail:
      'Record the sample title, page count, language pair, rights context, source quality, and reviewer before running OCR or translation.',
  },
  {
    label: 'Error counts',
    detail:
      'Count missed text regions, merged speakers, incorrect reading order, transcription errors, glossary misses, and output lines that need human correction.',
  },
  {
    label: 'Before and after',
    detail:
      'Keep the original page, OCR text, corrected OCR text, glossary notes, and final translation together so a reviewer can reproduce the decision.',
  },
  {
    label: 'Go or no-go',
    detail:
      'Publish or cite the sample only when rights are clear, OCR coverage is acceptable, correction notes are preserved, and support can answer follow-up questions.',
  },
] as const;

const reviewerFailureModes = [
  {
    title: 'Merged unrelated bubbles',
    description:
      'Two nearby bubbles, captions, or sound effects are grouped into one translation unit and change the speaker or timing.',
  },
  {
    title: 'Lost vertical or small text',
    description:
      'Vertical dialogue, handwritten notes, small UI labels, or side comments are skipped even though they affect the page meaning.',
  },
  {
    title: 'Broken name continuity',
    description:
      'A character, place, rank, or technique appears under multiple translations because the glossary was not checked before output.',
  },
  {
    title: 'Unclear sharing permission',
    description:
      'The translated result looks technically readable, but the source material is not owned, public-domain, an official sample, or otherwise approved.',
  },
] as const;

const trustPacketRows = [
  {
    label: 'Official install path',
    detail:
      'Use the Nayovi download page as the source of truth for APK access, build context, setup help, and support.',
  },
  {
    label: 'Reviewer access',
    detail:
      'Use redeem codes, free trial access, screenshots, and the narrated demo when editors need to test without guessing how activation works.',
  },
  {
    label: 'Public policy link',
    detail:
      'Use the official sources and takedown policy when a moderator, creator, or directory reviewer needs the content boundary in writing.',
  },
  {
    label: 'No chapter hosting',
    detail:
      'Describe Nayovi as hosted OCR and translation support. Do not describe it as a manga source, chapter mirror, extension index, or library.',
  },
] as const;

const androidTranslatorCriteria = [
  {
    title: 'Official APK source',
    description:
      'Use a translator app with a public download page, build context, support route, and pricing handoff instead of a mirror-first APK page.',
  },
  {
    title: 'Hosted OCR workflow',
    description:
      'Prefer hosted OCR and translation when readers should not manage provider API keys, local OCR engines, or screenshot upload chains on the device.',
  },
  {
    title: 'Reader-fit page handling',
    description:
      'Check whether the workflow accounts for vertical manhwa pages, speech bubbles, narration boxes, names, recurring terms, and short dialogue.',
  },
  {
    title: 'Responsible-use boundary',
    description:
      'A serious tool should say it does not host chapters and should limit review, pilot, or public examples to owned, public-domain, official-sample, or approved content.',
  },
] as const;

const androidTranslatorDecisionRows = [
  {
    label: 'Free trial fit',
    detail:
      'Use the free trial when you want to confirm install, activation, OCR coverage, and translation readability before paying.',
  },
  {
    label: 'Paid reader fit',
    detail:
      'Move to a monthly token plan when translation becomes a repeat reading workflow and support, device recovery, and usage controls matter.',
  },
  {
    label: 'Reviewer fit',
    detail:
      'Ask for a review code when you need screenshots, APK source details, pricing context, demo proof, and responsible-use language before publishing.',
  },
  {
    label: 'Partner fit',
    detail:
      'Use an approved-sample pilot when a creator, publisher, community, or localization team wants private evidence before any public mention.',
  },
] as const;

const androidTranslatorLinkRows = [
  {
    label: 'Install',
    detail:
      'Start from the Nayovi download page so the APK source, current build, support path, and mirror boundary stay attached.',
  },
  {
    label: 'Evaluate quality',
    detail:
      'Use the comic OCR checklist to inspect text detection, reading order, glossary consistency, and sharing permission.',
  },
  {
    label: 'Decide plan',
    detail:
      'Use pricing after the free trial confirms that hosted translation is a repeat workflow, not a one-off curiosity.',
  },
] as const;

const androidTranslatorReadinessRows = [
  {
    audience: 'Repeat Android readers',
    signal:
      'They translate more than one sample, care about device recovery and support, and want one official APK source instead of juggling generic upload tools.',
    nextStep:
      'Start with the free trial, then compare monthly token plans after OCR quality and reading cadence are clear.',
  },
  {
    audience: 'Reviewers and directories',
    signal:
      'They need APK metadata, screenshots, demo proof, pricing context, and responsible-use language before mentioning Nayovi publicly.',
    nextStep:
      'Request a review code and cite the download, pricing, support, and workflow pages from the official site.',
  },
  {
    audience: 'Creators and publishers',
    signal:
      'They control the sample and want private evidence before considering accessibility notes, reader research, or a broader pilot.',
    nextStep:
      'Use the approved-sample pilot brief and keep screenshots, translations, and partner names private until approved.',
  },
] as const;

const approvedSampleTestingSteps = [
  {
    title: '1. Choose the sample with permission',
    description:
      'Use owned pages, public-domain material, official previews, creator-provided samples, or written partner approval before running OCR or translation.',
  },
  {
    title: '2. Record the test scope',
    description:
      'Write down the title, language pair, page count, source context, reviewer role, and whether the test uses a free trial, review code, or pilot code.',
  },
  {
    title: '3. Run a small OCR pass first',
    description:
      'Check text detection, reading order, merged bubbles, vertical text, sound effects, and glossary terms before asking anyone to judge final translation quality.',
  },
  {
    title: '4. Review the translation privately',
    description:
      'Keep original OCR, corrected OCR, glossary notes, and final output together so a human reviewer can explain what passed and what still needs correction.',
  },
  {
    title: '5. Decide what can be shared',
    description:
      'Publish only approved screenshots, summaries, or review notes. Keep the test private when rights, sample approval, or output quality are not clear.',
  },
] as const;

const approvedSampleEvidenceRows = [
  {
    label: 'For reviewers',
    detail:
      'Provide the official APK source, narrated demo, review-code path, pricing context, support link, and the no-chapter-hosting boundary before any public article.',
  },
  {
    label: 'For creators',
    detail:
      'Keep source pages and translated output private unless the creator approves a public excerpt, screenshot, or case-study summary.',
  },
  {
    label: 'For communities',
    detail:
      'Use a no-link explanation first when rules are strict, and link the checklist only when moderators or readers ask for a concrete QA workflow.',
  },
  {
    label: 'For partners',
    detail:
      'Track whether the test creates qualified Android installs, support questions, repeat translation intent, affiliate interest, or a next pilot conversation.',
  },
] as const;

const trialTokenDecisionRows = [
  {
    title: 'Start with the free trial',
    description:
      'Use the trial to confirm the APK installs cleanly, activation works, OCR finds the text, and the translated page is readable on material you are allowed to process.',
  },
  {
    title: 'Upgrade only after repeat use',
    description:
      'Choose a monthly token plan when you have recurring manga, manhwa, or manhua translation needs and the hosted OCR workflow saves enough time to justify paid access.',
  },
  {
    title: 'Use review or pilot codes for public tests',
    description:
      'Reviewers, affiliates, creator teams, and communities should request a dedicated code when they need attribution, support tracking, screenshots, or approved-sample evidence.',
  },
] as const;

const tokenPlanFitRows = [
  {
    label: 'Trial signal',
    detail:
      'The reader completes install, activation, and one small approved translation test without needing manual support.',
  },
  {
    label: 'Paid signal',
    detail:
      'The same reader returns with more pages, repeated language pairs, device recovery needs, or a regular title workflow.',
  },
  {
    label: 'Hold signal',
    detail:
      'The user only wants one curiosity test, cannot confirm source permission, or needs a public result before quality and rights are clear.',
  },
  {
    label: 'Partner signal',
    detail:
      'A reviewer, directory, creator, publisher, or community can send qualified readers only after official links, disclosure, and responsible-use notes are attached.',
  },
] as const;

const tokenPlanLinkRows = [
  {
    label: 'Install first',
    detail:
      'Use the official download page so APK source, current build context, support, and no-mirror guidance stay attached.',
  },
  {
    label: 'Check quality',
    detail:
      'Use the OCR checklist and approved-sample guide before assuming a paid plan is useful for a specific language pair or title.',
  },
  {
    label: 'Compare plans',
    detail:
      'Open pricing only after the trial proves repeat value, or when a reviewer or group pilot needs a trackable code.',
  },
] as const;

const tokenPlanProofRows = [
  {
    label: 'Before paying',
    detail:
      'Confirm one permitted sample translates well enough to repeat, the token plan matches expected page volume, and support can handle activation or device recovery.',
  },
  {
    label: 'Before referring',
    detail:
      'Keep the APK source, pricing page, support route, responsible-use note, and review-code option attached to any article, directory listing, or affiliate mention.',
  },
  {
    label: 'Before piloting',
    detail:
      'Use a dedicated code and approved sample when a creator, publisher, community, or reviewer needs private evidence before public screenshots or recommendations.',
  },
] as const;

const tokenPlanRecoveryRows = [
  {
    label: 'Activation issue',
    detail:
      'Keep the order email, redeem code, device type, and screenshot of the activation state together before contacting support.',
  },
  {
    label: 'Device change',
    detail:
      'Ask support to review the account and device history instead of buying a second plan or sharing a code across unrelated devices.',
  },
  {
    label: 'Reviewer access',
    detail:
      'Use a dedicated review or pilot code when an editor, affiliate, directory, or partner needs test access separated from normal paid readers.',
  },
  {
    label: 'Refund-risk check',
    detail:
      'Do the free trial and one small approved translation test first so paid access is tied to repeat value, not a misunderstood one-off install.',
  },
] as const;

const directoryPacketRows = [
  {
    item: 'One-line listing description',
    copy: 'Nayovi is an Android APK for hosted OCR and AI translation support in manga, manhwa, and manhua reader workflows.',
  },
  {
    item: 'Primary link',
    copy: 'Use https://tachiyomiat.com/download for installs and keep pricing, support, and activation questions on the official Nayovi site.',
  },
  {
    item: 'Review-code path',
    copy: 'Editors, directory reviewers, and affiliate testers can request a redeem code through support before publishing a hands-on walkthrough.',
  },
  {
    item: 'Responsible-use wording',
    copy: 'Nayovi should be tested only with owned material, public-domain works, official samples, or content the user has permission to process.',
  },
] as const;

const demoPacketRows = [
  {
    item: 'Narrated demo',
    detail:
      'Offer the current short demo when an editor wants to see source page context, language choice, hosted translation progress, and the final English result before requesting access.',
  },
  {
    item: 'Screenshots',
    detail:
      'Use official Android screenshots that show install confidence, activation, translation flow, support, and pricing context without exposing unrelated reader libraries.',
  },
  {
    item: 'Reviewer code',
    detail:
      'Provide a dedicated redeem code only for hands-on evaluation, with no promise of coverage, ranking, link placement, or positive review.',
  },
  {
    item: 'Decision links',
    detail:
      'Include download, pricing, support, workflow, privacy, terms, and takedown-policy links so readers can verify the product before installing or paying.',
  },
] as const;

const aiDirectoryProofRows = [
  {
    label: 'Screenshot set',
    detail:
      'Use a short Android screenshot set that proves install confidence, redeem-code activation, translation progress, output review, pricing, and support paths.',
  },
  {
    label: 'Demo link',
    detail:
      'Pair screenshots with the narrated demo so AI-tool directories can verify the workflow without guessing whether Nayovi is only a generic upload site.',
  },
  {
    label: 'Listing metadata',
    detail:
      'Classify Nayovi as an Android app, AI OCR workflow, manga translation support, manhwa translation support, and hosted reader utility.',
  },
  {
    label: 'Conversion handoff',
    detail:
      'Send directory visitors to the official download, pricing, support, and workflow pages so qualified traffic can move from trial to paid token plans.',
  },
  {
    label: 'Responsible boundary',
    detail:
      'Keep every listing clear that Nayovi does not host or distribute chapters and should be tested with owned, public-domain, official-sample, or permission-approved content.',
  },
] as const;

const pilotBriefRows = [
  {
    label: 'Approved sample',
    detail:
      'Name the pages, language pair, rights context, and reviewer before Nayovi processes a publisher, creator, or community pilot.',
  },
  {
    label: 'Dedicated access',
    detail:
      'Use a review or pilot redeem code so support questions, trial usage, and follow-up conversion can be separated from normal readers.',
  },
  {
    label: 'Success signal',
    detail:
      'Continue only when the pilot shows useful OCR review, qualified Android installs, affiliate interest, or repeat paid token demand.',
  },
] as const;

const pilotOnePagerRows = [
  {
    label: 'Who chooses the sample',
    detail:
      'The creator, publisher, community moderator, or reviewer chooses the pages and confirms the sample can be used for OCR and translation testing.',
  },
  {
    label: 'What Nayovi tests',
    detail:
      'The pilot checks Android activation, hosted OCR coverage, reading order, glossary consistency, translation draft quality, and reviewer correction needs.',
  },
  {
    label: 'What stays private',
    detail:
      'Source files, translated pages, screenshots, and correction notes stay private unless the rights holder or sample owner approves public use.',
  },
  {
    label: 'How access is separated',
    detail:
      'A dedicated redeem code keeps pilot usage, support questions, and conversion signals separate from normal reader trials.',
  },
  {
    label: 'When to continue',
    detail:
      'Continue only when the pilot produces useful OCR evidence, responsible public wording, qualified installs, affiliate interest, or repeat paid token demand.',
  },
] as const;

const pilotOutcomeRows = [
  {
    title: 'Useful for publishers',
    description:
      'Evaluate approved sample pages without implying Nayovi can translate a catalog or replace professional localization.',
  },
  {
    title: 'Useful for creators',
    description:
      'Test whether an Android reader workflow can help with preview pages, accessibility checks, or multilingual audience feedback.',
  },
  {
    title: 'Useful for reviewers',
    description:
      'Publish a fair app review with source-of-truth links, pricing context, APK verification, and the no-chapter-hosting boundary.',
  },
] as const;

const pilotReportRows = [
  {
    label: 'Sample summary',
    detail:
      'Record the page count, language pair, source permission, reviewer role, Android device, and whether the test used a trial, review code, or pilot code.',
  },
  {
    label: 'Quality evidence',
    detail:
      'Send missed text counts, merged bubble notes, glossary corrections, translation edits, and a private before/after comparison when sharing is approved.',
  },
  {
    label: 'Business signal',
    detail:
      'Track whether the pilot produced qualified installs, support questions, repeat translation intent, affiliate interest, or a next conversation with the partner.',
  },
  {
    label: 'Stop condition',
    detail:
      'Pause public discussion if rights are unclear, the sample cannot be shared, OCR misses key dialogue, or the partner cannot explain a useful reader outcome.',
  },
] as const;

const pilotDecisionRows = [
  {
    label: 'Proceed to review',
    detail:
      'Move forward when the partner approves the sample, OCR misses are minor, reviewer corrections are documented, and a public note can preserve credits and source boundaries.',
  },
  {
    label: 'Proceed to private pilot',
    detail:
      'Keep the pilot private when the workflow is useful but screenshots, translated pages, or partner names are not approved for public citation.',
  },
  {
    label: 'Pause and fix',
    detail:
      'Pause when OCR misses key dialogue, glossary drift changes names or terms, support cannot reproduce activation, or the partner cannot identify a useful reader outcome.',
  },
  {
    label: 'Stop outreach',
    detail:
      'Stop the thread when source rights are unclear, the sample owner is not involved, the partner asks for paid link placement, or the review would imply unauthorized catalog translation.',
  },
] as const;

const communitySubmissionRows = [
  {
    channel: 'Startup launch communities',
    readiness:
      'Use only founder-owned accounts for BetaList, Product Hunt, or Show HN-style launches, and send people to a working Nayovi page with APK access, demo context, pricing, and support.',
  },
  {
    channel: 'Q&A and forum communities',
    readiness:
      'Answer only when the question is genuinely about OCR workflow, Android setup, or permission-safe translation. Disclose Nayovi affiliation and omit links unless the rules clearly allow a relevant source.',
  },
  {
    channel: 'GitHub resource lists',
    readiness:
      'Ask maintainers whether a neutral OCR checklist or documentation page fits before opening a pull request. Do not submit a product link as a generic resource.',
  },
  {
    channel: 'Newsletters and resource pages',
    readiness:
      'Pitch the workflow checklist, reviewer packet, or approved-sample brief as a useful reader resource. Skip any placement that requires paid link insertion or weak directory pages.',
  },
  {
    channel: 'Reddit and social posts',
    readiness:
      'Use no-link feedback drafts first, check community rules, and avoid generated or repeated comments. A link belongs only when it helps the discussion and is allowed.',
  },
] as const;

const submissionReadinessRows = [
  {
    item: 'Submit only official links',
    detail:
      'Use tachiyomiat.com download, pricing, support, workflow, privacy, terms, and takedown URLs so a listing does not become a mirror-first install path.',
  },
  {
    item: 'Package evidence',
    detail:
      'Include the APK build label, SHA-256, screenshots, narrated demo, review-code path, and a concise pricing summary before asking an editor to test Nayovi.',
  },
  {
    item: 'Qualify the audience',
    detail:
      'Prioritize Android readers, AI-tool directories, localization operators, and creator-platform partners who can send trial activations or pilot conversations.',
  },
  {
    item: 'Avoid weak placements',
    detail:
      'Skip paid link insertion, scraped directories, listings that hide official support links, or communities where product links would not help the discussion.',
  },
] as const;

const submissionQueueRows = [
  {
    lane: 'Ready after cap reset',
    fit: 'Approved-sample partner inquiries where the public contact path is official and the message asks for workflow feedback, not catalog access or backlink placement.',
  },
  {
    lane: 'Needs packet first',
    fit: 'AI-tool directories, Android app directories, and newsletters that require screenshots, package metadata, pricing, and review-code context before a useful submission.',
  },
  {
    lane: 'Use as context only',
    fit: 'Policy discussions, research papers, and community threads that can improve Nayovi copy or QA standards but should not receive a product pitch.',
  },
  {
    lane: 'Hold or skip',
    fit: 'Any listing that requires paid placement, reciprocal links, hidden support links, private data scraping, or a claim that Nayovi can translate unauthorized catalogs.',
  },
] as const;

const capResetPacketRows = [
  {
    field: 'First outreach lane',
    detail:
      'Handle reply-driven follow-ups first, then approved-sample partner inquiries such as creator platforms, publishers, localization teams, or manga communities with official public contact paths.',
  },
  {
    field: 'Proof links to include',
    detail:
      'Use the permission-safe pilot brief, comic OCR checklist, official download page, support path, and pricing page so every recipient can verify scope before replying.',
  },
  {
    field: 'Message boundary',
    detail:
      'Ask for feedback on a small approved-sample workflow; do not ask for catalog access, unpaid labor, a guaranteed article, paid placement, or a backlink as the first outcome.',
  },
  {
    field: 'Revenue signal to track',
    detail:
      'Log whether the conversation can create a review code request, partner pilot, qualified install path, affiliate test, investor introduction, or paid-plan signal.',
  },
] as const;

const replyTriageRows = [
  {
    reply: 'Review-code request',
    response:
      'Send the support path with official APK source, screenshots, narrated demo context, pricing, and responsible-use language so the reviewer can test without guessing activation details.',
  },
  {
    reply: 'Approved-sample pilot',
    response:
      'Keep the first test private and limited to owned, public-domain, official preview, creator-provided, or otherwise approved samples before any public mention is discussed.',
  },
  {
    reply: 'Call or interview request',
    response:
      'Use owner-provided contact details or ask for concrete availability only when the reply indicates a real editorial, partnership, investor, or commercial conversation.',
  },
  {
    reply: 'Weak or noncompliant reply',
    response:
      'Decline paid link placement, reciprocal backlink gates, mirror-first APK uploads, hidden pricing or support links, and claims about unauthorized catalog translation.',
  },
] as const;

const replyQualificationRows = [
  {
    signal: 'High-value reply',
    action:
      'Advance when the contact asks for review access, an approved-sample pilot, a technical listing packet, a founder interview, or commercial diligence tied to real testing.',
  },
  {
    signal: 'Needs one clarifier',
    action:
      'Ask for the exact sample scope, listing requirements, audience, timeline, or review-code need before sending assets, scheduling time, or involving the owner.',
  },
  {
    signal: 'Owner escalation',
    action:
      'Escalate only when the next step requires a live call, commercial commitment, legal decision, custom pricing, investor materials, or the owner choosing a time.',
  },
  {
    signal: 'Decline cleanly',
    action:
      'Close the thread when the reply asks for paid backlinks, reciprocal links, scraped listings, mirror-first APK uploads, hidden pricing, or unauthorized catalog translation.',
  },
] as const;

const comparisonPacketRows = [
  {
    format: 'Android APK workflow',
    check:
      'Verify the official download page, APK metadata, redeem-code activation, support path, and hosted OCR behavior before sending readers to install.',
  },
  {
    format: 'Browser comic translator',
    check:
      'Compare upload handling, text-block editing, layout preservation, version history, and whether the tool can document human review before sharing output.',
  },
  {
    format: 'Creator or publisher pilot',
    check:
      'Start with creator-controlled samples, official previews, public-domain pages, or explicit written permission before evaluating localization quality.',
  },
  {
    format: 'Directory or roundup mention',
    check:
      'Prefer listings that preserve source-of-truth links, pricing, support, and the no-chapter-hosting boundary instead of treating the app as a mirror.',
  },
] as const;

const neutralChecklistRows = [
  {
    prompt: 'Permission status',
    checklist:
      'Name whether the sample is owned, public-domain, an official preview, creator-provided, or otherwise approved before reviewing OCR or translation quality.',
  },
  {
    prompt: 'OCR completeness',
    checklist:
      'Compare detected text against the full page and mark missed bubbles, captions, sound effects, small labels, vertical text, or handwritten notes.',
  },
  {
    prompt: 'Block order and grouping',
    checklist:
      'Confirm reading order and flag unrelated bubbles, captions, or speakers that were merged into one translation unit.',
  },
  {
    prompt: 'Reviewer correction path',
    checklist:
      'Keep original OCR text, merged blocks, glossary notes, and final output visible enough for a human reviewer to correct names, terms, and tone.',
  },
  {
    prompt: 'Share decision',
    checklist:
      'Record whether the result is private-use only, ready for an approved sample note, or blocked because source rights or output quality are unclear.',
  },
] as const;

const standaloneChecklistSections = [
  {
    title: 'Responsible sample scope',
    items: [
      'Confirm the sample is owned, public-domain, an official preview, creator-approved, or otherwise permission-approved for OCR and translation testing.',
      'Do not use platform catalog pages, paid chapters, or third-party scans as public demo material without explicit permission.',
      'Keep source, permission status, language pair, and review date with the QA notes.',
      'Do not share translated output publicly until the permission status supports that use.',
    ],
  },
  {
    title: 'Pre-OCR capture',
    items: [
      'Confirm the full page, double-page spread, or long-strip segment is present before OCR starts.',
      'Check that speech bubbles, narration boxes, side comments, small labels, handwritten effects, and vertical text are visible enough to inspect.',
      'Record whether the sample is manga, manhwa, manhua, webtoon, western comic, or mixed format because reading order changes the review.',
      'Keep a copy of the original page image beside the OCR output during review.',
    ],
  },
  {
    title: 'OCR completeness',
    items: [
      'Count whether all visible text regions were detected.',
      'Flag missing text regions before judging translation quality.',
      'Mark uncertain regions where stylized lettering, low contrast, or small print may need manual correction.',
      'Keep original OCR text visible so reviewers can distinguish OCR mistakes from translation mistakes.',
    ],
  },
  {
    title: 'Reading order and grouping',
    items: [
      'Compare OCR block order with the page reading flow.',
      'Check that unrelated speech bubbles, captions, and sound effects were not merged into one translation unit.',
      'Check that a single sentence split across bubbles has not been separated in a way that changes meaning.',
      'Review long-strip ordering separately from page-by-page ordering.',
    ],
  },
  {
    title: 'Translation review',
    items: [
      'Track glossary decisions for names, places, ranks, techniques, honorifics, and recurring terms.',
      'Verify that speaker tone and relationship context survive the translation.',
      'Check that UI labels, source names, filenames, and other non-dialogue metadata were not translated accidentally.',
      'Review failed OCR blocks before retrying translation so the model is not asked to fix missing or corrupted input.',
    ],
  },
  {
    title: 'Share or submit decision',
    items: [
      'For public examples, include only approved samples and summarize sensitive details when permission is narrow.',
      'For GitHub or newsletter submissions, use this checklist as the resource and mention Nayovi only when the context allows affiliation disclosure.',
      'For forums, Reddit, Q&A, or community replies, use a no-link version unless product links are explicitly allowed and useful.',
      'For Android reviewers and directories, pair the checklist with official source links, support path, pricing, privacy, terms, and responsible-use notes.',
    ],
  },
] as const;

const citationReadinessRows = [
  {
    label: 'Who should cite it',
    detail:
      'Use this page for Android reviewers, OCR resource maintainers, localization editors, moderators, and creator-platform teams that need a product-light quality checklist.',
  },
  {
    label: 'Best link context',
    detail:
      'Pair the checklist with approved-sample notes, screenshot packets, reviewer-code requests, or maintainer questions instead of a generic app-install pitch.',
  },
  {
    label: 'When to omit the link',
    detail:
      'Skip the URL in communities that restrict self-promotion, unanswered moderation threads, or conversations where a no-link workflow answer is enough.',
  },
  {
    label: 'Disclosure',
    detail:
      'When Nayovi is mentioned, disclose the relationship and keep the useful checklist separate from claims about app rankings, endorsements, or third-party approval.',
  },
] as const;

const comicOcrResearchRows = [
  {
    label: 'Missing regions',
    detail:
      'Treat undetected bubbles, captions, sound effects, and small labels as OCR failures before judging translation quality.',
  },
  {
    label: 'Segmentation drift',
    detail:
      'Flag under-segmented or over-merged speech balloons because a fluent translation can still be based on the wrong text unit.',
  },
  {
    label: 'Transcription checks',
    detail:
      'Keep original OCR text visible so reviewers can separate transcription mistakes from glossary, tone, or model-output mistakes.',
  },
  {
    label: 'Evidence standard',
    detail:
      'Use current manga OCR research as context only; do not imply dataset access, benchmark performance, or third-party endorsement without proof.',
  },
] as const;

const sourceBoundaries = [
  {
    title: 'Allowed sources',
    description:
      'Creator-owned material, public-domain works, official samples, official previews, licensed personal-use pages where processing is permitted, and material with explicit rights-holder permission.',
  },
  {
    title: 'Not allowed',
    description:
      'Licensed rips, unauthorized scan uploads, ad-heavy chapter mirrors, paywall bypasses, paid fan-translation leaks, or any source promoted mainly as free access to copyrighted chapters.',
  },
  {
    title: 'What Nayovi provides',
    description:
      'The service provides Android setup, redeem-code activation, hosted OCR, translation processing, source-discovery support, and customer support. It does not sell or host manga chapters.',
  },
] as const;

const takedownSteps = [
  'Send the request to support with the work title, affected Nayovi URL or feature, your rights-holder relationship, and a reliable contact address.',
  'Include enough detail for the support team to identify the reported material or workflow output without exposing unrelated private files.',
  'Nayovi can remove public references, disable hosted processing where appropriate, preserve abuse evidence, and cooperate with lawful requests.',
  'Good-faith correction requests are welcome for attribution, terminology, source labeling, and policy wording.',
] as const;

interface SetupGuideCopy {
  description: string;
  eyebrow: string;
  firstRunIntro: string;
  title: string;
}

const mihonNayoviSetupGuideCopy: SetupGuideCopy = {
  description:
    'Set up Nayovi as a hosted OCR and translation workflow for Mihon, Tachiyomi, and TachiyomiAT-style Android readers without turning the project into a chapter source, extension list, or piracy index.',
  eyebrow: 'Setup guide',
  firstRunIntro:
    'This sequence keeps installation, activation, and policy checks clear before any translation job is processed.',
  title: 'Mihon, TachiyomiAT and Nayovi setup guide',
};

const mihonTachiyomiAtSetupGuideCopy: SetupGuideCopy = {
  description:
    'Use this setup guide if you searched for Mihon, TachiyomiAT, or Tachiyomi. Nayovi is the current branded Android APK and hosted OCR translation workflow.',
  eyebrow: 'TachiyomiAT setup',
  firstRunIntro:
    'This sequence maps older Mihon, Tachiyomi, and TachiyomiAT setup intent to the current Nayovi Android APK and hosted translation flow.',
  title: 'Mihon and TachiyomiAT setup guide',
};

export const PageMihonNayoviSetupGuide = () => {
  return <SetupGuidePage copy={mihonNayoviSetupGuideCopy} />;
};

export const PageMihonTachiyomiAtSetupGuide = () => {
  return <SetupGuidePage copy={mihonTachiyomiAtSetupGuideCopy} />;
};

export const PageComicOcrChecklist = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="OCR checklist"
        title="Comic OCR translation QA checklist"
        description="A neutral review checklist for manga, manhwa, manhua, webtoon, and comic OCR translation tests. Use it before sending samples to editors, maintainers, moderators, directories, or partners."
        className="pt-10"
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              This checklist is intentionally useful without requiring a
              product link. It helps reviewers separate sample permission, OCR
              completeness, reading order, glossary review, and public sharing
              decisions.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Use approved samples first. Nayovi does not host chapters or
              replace rights-holder permission for public translation examples.
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Review steps"
        title="What to verify before judging translation quality"
        description="Most translation complaints start earlier in the workflow: missing text, bad grouping, unclear rights, or glossary drift."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {standaloneChecklistSections.map((section) => (
            <Card key={section.title} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-7 text-muted-foreground">
                {section.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-border/70 px-4 py-3"
                  >
                    {item}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Citation ready"
        title="How to use this checklist in public"
        description="The safest distribution path is to make the checklist useful on its own, then add the Nayovi product link only when the audience asks for implementation details."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {citationReadinessRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Research context"
        title="Quality checks that belong before translation"
        description="Current manga OCR and document-understanding work reinforces the same practical rule: missing text regions and bad segmentation should be recorded before anyone scores the translated sentence."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {comicOcrResearchRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Use the asset"
        title="Share it without turning it into a sales pitch"
        description="For maintainers, newsletter editors, moderators, and localization teams, lead with the checklist and disclose Nayovi affiliation only where relevant."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/guides/translation-support-workflow"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Full workflow guide
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/download"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            APK verification packet
          </a>
          <a
            href="/support"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Request review access
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PagePermissionSafePilotBrief = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Pilot brief"
        title="Permission-safe manga translation pilot brief"
        description="A short evaluation plan for creators, publishers, communities, reviewers, and localization partners who want to test Nayovi with approved samples before any public mention."
        className="pt-10"
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              This page is for approved-sample pilots. Nayovi does not host
              manga, manhwa, or manhua chapters and does not replace creator,
              publisher, or rights-holder permission.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Use it when a partner needs a concise way to decide whether a
              review code, affiliate test, creator feedback loop, or
              localization workflow conversation is worth scheduling.
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Pilot scope"
        title="What the pilot covers"
        description="The goal is to measure OCR and translation workflow fit without creating public examples from unclear source material."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {pilotOnePagerRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Partner fit"
        title="When this is a good use of time"
        description="Use the brief for serious review, partnership, or feedback conversations where the partner controls or approves the sample."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {pilotOutcomeRows.map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Pilot report"
        title="What to send back after a test"
        description="A useful pilot produces reviewer evidence and a revenue-relevant next step, not just a polite opinion about AI translation."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {pilotReportRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Decision packet"
        title="How to decide the next step"
        description="Use this section after a pilot so creator-platform, publisher, reviewer, or localization conversations turn into a clear continue, private-test, fix, or stop decision."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {pilotDecisionRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Next"
        title="Request a review or pilot code"
        description="Send the sample scope, language pair, rights context, and reviewer goal through support before uploading or publishing anything."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/support"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Contact support
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/guides/comic-ocr-translation-checklist"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            OCR checklist
          </a>
          <a
            href="/guides/translation-support-workflow"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Full workflow
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageBestAndroidMangaTranslatorApk = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Android APK guide"
        title="Best Android manga translator APK: what to check"
        description="A practical checklist for readers, reviewers, directories, and communities comparing Android manga, manhwa, and manhua translation apps without relying on unofficial mirrors."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {androidTranslatorCriteria.map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Why Nayovi fits"
        title="Use official install, hosted OCR, and clear activation"
        description="Nayovi is built around an Android APK, redeem-code activation, hosted OCR and AI translation, free trial access, token plans, and support from the official site."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Official APK: {androidApkDownload.filename} from the Nayovi
              download page, with version context, source-of-truth links, and
              support attached.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Workflow: install the APK, activate trial or review access, test
              OCR and translation on permitted samples, then decide whether a
              paid token plan fits repeat reading.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Boundary: Nayovi does not host or distribute chapters. Use it
              for owned content, public-domain material, official samples, or
              content you have permission to process.
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Decision path"
        title="Choose the right next step"
        description="The best translator APK is the one that produces a clear install, test, upgrade, or stop decision."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {androidTranslatorDecisionRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Compare"
        title="Keep every comparison tied to source-of-truth links"
        description="Directories, reviewers, and communities should be able to cite the same official install, quality, and pricing path."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {androidTranslatorLinkRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Qualified intent"
        title="Know when an APK comparison can become revenue"
        description="A durable mention should send the right person to the right action: reader trial, paid plan, review access, or an approved-sample pilot."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {androidTranslatorReadinessRows.map((row) => (
            <Card key={row.audience} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.audience}</CardTitle>
                <CardDescription>{row.signal}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-muted-foreground">
                {row.nextStep}
              </CardContent>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Next"
        title="Install, test, then choose a plan"
        description="Start with the official APK and free trial. Reviewers, partners, and communities can request codes before publishing a comparison or sending readers to Nayovi."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/download"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Download APK
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/pricing"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Compare plans
          </a>
          <a
            href="/support"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Request review code
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageApprovedSampleTestingGuide = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Approved samples"
        title="How to test AI manhwa translation safely"
        description="A practical guide for reviewers, creators, communities, and partner teams testing Nayovi OCR and AI translation with approved manga, manhwa, or manhua samples."
        className="pt-10"
      >
        <div className="grid gap-4">
          {approvedSampleTestingSteps.map((step) => (
            <Card key={step.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Evidence"
        title="Make the test useful before anyone shares it"
        description="A safe test should produce a clear quality decision, a support handoff, and a business signal without turning unclear source material into public marketing."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {approvedSampleEvidenceRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Nayovi test path"
        title="Use trial access, review codes, or pilot codes deliberately"
        description="Readers can start with the free trial. Reviewers and partners should request a code when they need clean attribution, support tracking, and a fair product evaluation."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Install from the official Nayovi APK page so the current build,
              support path, pricing context, and source-of-truth links stay
              attached to the test.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Use the OCR checklist before judging translation quality. Missing
              text, bad reading order, or glossary drift should be fixed before
              anyone treats the output as review evidence.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Continue to a monthly token plan only when the test shows repeat
              translation demand, not just a one-off curiosity.
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Next"
        title="Start with the smallest approved test"
        description="Use one approved sample, keep reviewer notes private, and choose the next step only after permission, OCR quality, and activation are clear."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/download"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Download APK
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/guides/comic-ocr-translation-checklist"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            OCR checklist
          </a>
          <a
            href="/support"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Request review code
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageFreeTrialVsTokenPlanGuide = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Pricing guide"
        title="Free trial vs paid token plan for manga translation"
        description="A practical decision guide for Android readers, reviewers, affiliates, and approved-sample pilots deciding when Nayovi should stay a trial, become a paid plan, or use a dedicated code."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {trialTokenDecisionRows.map((row) => (
            <Card key={row.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{row.title}</CardTitle>
                <CardDescription>{row.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Upgrade signals"
        title="Pay for recurring translation, not curiosity"
        description="The strongest revenue signal is repeated Android translation demand after install, activation, OCR quality, and support expectations are clear."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {tokenPlanFitRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Source-of-truth path"
        title="Keep trial and paid traffic on official links"
        description="Directories, reviewers, affiliates, and communities should send readers through the same verified path before anyone pays or publishes a recommendation."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            {tokenPlanLinkRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 bg-background/45 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold">{row.label}</span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Buyer confidence"
        title="Verify the repeat-use case before checkout"
        description="A paid plan should follow proof that Nayovi is useful for the reader's language pair, source material, and Android workflow. Public referrals need the same proof attached."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {tokenPlanProofRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Support confidence"
        title="Know the recovery path before a paid plan"
        description="Paid readers, reviewers, and affiliates should understand how activation, device changes, review codes, and refund-risk checks are handled before recommending or buying."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            {tokenPlanRecoveryRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 bg-background/45 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold">{row.label}</span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Next"
        title="Test the APK, then choose the right access path"
        description="Use the free trial for one small permitted test. Move to pricing when the workflow repeats; use support when a reviewer, affiliate, or partner needs a dedicated code."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/download"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Download APK
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/pricing"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Compare token plans
          </a>
          <a
            href="/support"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Request a code
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

const SetupGuidePage = (props: { copy: SetupGuideCopy }) => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow={props.copy.eyebrow}
        title={props.copy.title}
        description={props.copy.description}
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {setupSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Reader lineage"
        title="TachiyomiAT, Tachiyomi and Mihon context"
        description="The public pages keep familiar reader search language visible while pointing readers to the current Nayovi app and support workflow."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {readerLineageNotes.map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Safe setup"
        title="Recommended first run"
        description={props.copy.firstRunIntro}
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Download Nayovi from the official APK link on this site. This is
              the current app path for readers arriving from TachiyomiAT,
              Tachiyomi, or Mihon searches.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Review the terms and confirm your use is limited to owned,
              permissioned, public-domain, or official sample material.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Activate hosted mode with a redeem code and run a small test page
              before processing larger batches.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Use support for billing, device recovery, setup issues, or policy
              questions.
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Next"
        title="Continue with the workflow"
        description="After installation, use the translation workflow guide for review, glossary, and takedown-ready handling."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/guides/translation-support-workflow"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Translation workflow
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href={androidApkDownload.href}
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Download APK
          </a>
          <a
            href="/legal/official-sources-takedown"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Source and takedown policy
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageTranslationSupportWorkflow = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Translation workflow"
        title="Translation support workflow"
        description="Use this workflow for permission-safe review, glossary control, and hosted OCR or translation support. It is not a guide for distributing unauthorized chapters."
        className="pt-10"
      >
        <div className="grid gap-4">
          {workflowSteps.map((step) => (
            <Card key={step.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="OCR checklist"
        title="Manhwa OCR review before translation"
        description="Use this checklist when a reviewer, directory editor, or partner needs a concrete way to evaluate Nayovi output on approved samples."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {ocrChecklistRows.map((row) => (
              <div
                key={row.checkpoint}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.checkpoint}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Research-backed QA"
        title="Checks that match modern manga OCR research"
        description="Use this section when technical reviewers, localization editors, or GitHub maintainers need a non-promotional reason to cite the workflow checklist."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {researchCitationRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Transparency"
        title="Human-review and credit safeguards"
        description="Use this section when manga media, creator platforms, or localization communities need to see that Nayovi is not positioning AI output as a replacement for professional translation work."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {transparencyRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Technical packet"
        title="A reproducible review packet for OCR maintainers"
        description="Use this packet when a GitHub maintainer, newsletter editor, or localization operator wants evidence rather than a product pitch."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {technicalEvaluationRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Quality bar"
        title="Review standards"
        description="Good translation support is slower than a raw OCR pass, but it avoids confusing names, missing bubbles, and policy problems."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: LanguagesIcon,
              title: 'Terminology',
              description:
                'Keep recurring names, ranks, techniques, locations, and honorific choices stable across pages.',
            },
            {
              icon: ShieldCheckIcon,
              title: 'Permission',
              description:
                'Stop the workflow when permission is unclear or a source looks like a rip, mirror, or paywall bypass.',
            },
            {
              icon: ScaleIcon,
              title: 'Accountability',
              description:
                'Keep credits, reviewer notes, and removal routes easy to find for contributors and rights holders.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Reviewer checklist"
        title="Common OCR translation failure modes"
        description="These are the checks Nayovi reviewers, Android app editors, and partner teams can use when judging an approved sample."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {reviewerFailureModes.map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Trust packet"
        title="What to include in a review, listing, or partner note"
        description="A clear source-of-truth packet makes Nayovi easier to evaluate without sending people to unofficial mirrors or unsupported communities."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {trustPacketRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Directory packet"
        title="Citation-ready app listing details"
        description="Use these details when an Android directory, app reviewer, newsletter, or partner needs a short, accurate description before deciding whether Nayovi belongs in a listing."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {directoryPacketRows.map((row) => (
              <div
                key={row.item}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.item}
                </span>
                <span>{row.copy}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Demo packet"
        title="Review assets for editors and directory teams"
        description="Use this packet when an Android reviewer, app directory, AI-tool directory, or partner asks for proof before testing Nayovi or publishing a listing."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {demoPacketRows.map((row) => (
              <div
                key={row.item}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.item}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="AI directory proof"
        title="Screenshot packet for AI-tool listings"
        description="Use this packet when AI-tool directories, startup directories, or SaaS roundups need visual proof and category metadata before sending qualified visitors to Nayovi."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {aiDirectoryProofRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Pilot brief"
        title="A clean starting point for publisher and community tests"
        description="Use this brief when a partner wants to evaluate Nayovi with approved material before any public mention, directory listing, or affiliate test."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {pilotBriefRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Community readiness"
        title="Where Nayovi can be mentioned without looking like a link drop"
        description="Use this section before submitting Nayovi to launch communities, Q&A sites, GitHub resource lists, newsletters, or social discussions."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {communitySubmissionRows.map((row) => (
              <div
                key={row.channel}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.channel}
                </span>
                <span>{row.readiness}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Submission checklist"
        title="Before sending Nayovi to a directory or resource page"
        description="Use this checklist to decide whether a public listing, resource-page pitch, or official submit form is likely to create qualified installs instead of low-quality links."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {submissionReadinessRows.map((row) => (
              <div
                key={row.item}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.item}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Submission queue"
        title="Which outreach should happen next"
        description="Use this queue after the daily cap resets so partner, directory, and resource-page work starts with the strongest revenue signal and the cleanest compliance path."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {submissionQueueRows.map((row) => (
              <div
                key={row.lane}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.lane}
                </span>
                <span>{row.fit}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Cap-reset packet"
        title="What to send when outreach capacity opens"
        description="Use this packet to keep the next email or official-form submission focused on reply quality, approved samples, and paid-use evidence instead of generic backlink collection."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {capResetPacketRows.map((row) => (
              <div
                key={row.field}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.field}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Reply triage"
        title="How to handle qualified replies"
        description="Use this packet after an editor, directory, partner, or investor replies so routine follow-up moves forward while true owner decisions stay visible."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {replyTriageRows.map((row) => (
              <div
                key={row.reply}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.reply}
                </span>
                <span>{row.response}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Reply qualification"
        title="Which replies deserve the next action"
        description="Use this matrix before spending review codes, founder time, or outreach capacity so replies move toward paid use, credible listings, or clean partner tests."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {replyQualificationRows.map((row) => (
              <div
                key={row.signal}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.signal}
                </span>
                <span>{row.action}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Comparison packet"
        title="How to compare Nayovi with adjacent OCR translation tools"
        description="Use this product-light checklist when an editor, creator platform, adjacent tool, or directory wants a fair comparison instead of a promotional claim."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {comparisonPacketRows.map((row) => (
              <div
                key={row.format}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.format}
                </span>
                <span>{row.check}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Neutral excerpt"
        title="Markdown checklist for maintainers and editors"
        description="Use this value-first version when a GitHub maintainer, newsletter editor, moderator, or localization community wants the checklist without product-first copy."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {neutralChecklistRows.map((row) => (
              <div
                key={row.prompt}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.prompt}
                </span>
                <span>{row.checklist}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Policy"
        title="Keep the workflow linkable"
        description="Directories and communities are more likely to accept a project when the public pages make the legal boundary clear."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/legal/official-sources-takedown"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Official sources policy
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/guides/mihon-nayovi-setup"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Setup guide
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageOfficialSourcesTakedown = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Policy"
        title="Official sources and takedown policy"
        description="Nayovi is for hosted OCR, translation support, activation, and troubleshooting. It does not host manga chapters or promote unauthorized chapter access."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {sourceBoundaries.map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Takedown"
        title="How to request review or removal"
        description="Rights holders, creators, publishers, and authorized representatives can request review when they believe Nayovi public pages, hosted processing, or support material involves unauthorized content."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {takedownSteps.map((step) => (
              <div key={step} className="rounded-xl border border-border/70 px-4 py-3">
                {step}
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Boundary"
        title="Community and directory submissions"
        description="Use this page when explaining Nayovi to directories, moderators, contributors, or reviewers who need to verify the project is a tool, not a chapter-hosting site."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/support"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Contact support
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/legal/terms"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Terms of service
          </a>
          <a
            href="/guides/translation-support-workflow"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Translation workflow
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};
