import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  CircleDollarSignIcon,
  FileCheck2Icon,
  LanguagesIcon,
  MessageSquareTextIcon,
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

const reviewerActivationChecks = [
  {
    icon: SmartphoneIcon,
    title: 'Install path',
    description:
      'Start from the official Nayovi APK page, then note the build label, pricing page, and support route used during the test.',
  },
  {
    icon: CircleDollarSignIcon,
    title: 'Paid signal',
    description:
      'Use a trial, paid plan, or scoped review code that matches the monthly chapter volume being demonstrated.',
  },
  {
    icon: MessageSquareTextIcon,
    title: 'Coverage notes',
    description:
      'Evaluate hosted OCR, translation output, glossary consistency, activation, cancellation support, and source-boundary messaging.',
  },
] as const;



const glossaryChecklistRows = [
  {
    checkpoint: 'Text region coverage',
    reviewerQuestion:
      'Did OCR capture dialogue, narration, vertical text, small labels, and sound effects before translation?',
    partnerSignal:
      'A partner can compare missed-region counts before deciding whether a sample is useful for public review.',
  },
  {
    checkpoint: 'Reading order and speaker turns',
    reviewerQuestion:
      'Are bubbles, panels, long-strip manhwa sequences, and short replies kept in the correct order?',
    partnerSignal:
      'Order notes help reviewers explain whether output quality failed because of OCR order, context, or translation wording.',
  },
  {
    checkpoint: 'Glossary and names',
    reviewerQuestion:
      'Are names, places, ranks, techniques, honorifics, and recurring UI terms recorded before expanding the test?',
    partnerSignal:
      'Glossary notes make repeat chapters, review codes, and partner pilots easier to compare over time.',
  },
  {
    checkpoint: 'Approved-sample decision',
    reviewerQuestion:
      'Is the source owned, public-domain, official-sample, creator-provided, or otherwise approved for this review?',
    partnerSignal:
      'Permission status decides whether results can stay private, become a case note, or must not be shared.',
  },
] as const;






const mediaKitSourceRows = [
  {
    label: 'Primary brand site',
    detail: 'https://nayovi.com',
  },
  {
    label: 'Official APK and release context',
    detail: 'https://tachiyomiat.com/download',
  },
  {
    label: 'Pricing and trial path',
    detail: 'https://tachiyomiat.com/pricing',
  },
  {
    label: 'Support and review access',
    detail: 'https://tachiyomiat.com/support',
  },
  {
    label: 'OCR QA checklist',
    detail: 'https://tachiyomiat.com/guides/comic-ocr-translation-checklist',
  },
  {
    label: 'Approved-sample pilot guide',
    detail:
      'https://tachiyomiat.com/guides/permission-safe-manga-translation-pilot',
  },
] as const;

const mediaKitAudienceRows = [
  {
    title: 'Android reviewers and app directories',
    description:
      'Start from the official download page, keep APK metadata and support links attached, and request review-code context before publishing a hands-on test.',
  },
  {
    title: 'Podcasts, newsletters, and editorial teams',
    description:
      'Lead with responsible OCR QA, approved-sample boundaries, and human-review checks instead of treating Nayovi as a generic app-install pitch.',
  },
  {
    title: 'Creator platforms and localization partners',
    description:
      'Use only owned, public-domain, official-sample, creator-provided, or permission-approved pages for pilots, screenshots, and public examples.',
  },
  {
    title: 'Investors and commercial partners',
    description:
      'Evaluate the Android APK, hosted OCR workflow, redeem-code activation, paid token plans, support path, and source-of-truth links together.',
  },
] as const;

const mediaKitClaimRows = [
  {
    label: 'Safe short description',
    detail:
      'Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.',
  },
  {
    label: 'Responsible-use line',
    detail:
      'Nayovi does not host or distribute chapters; use it with owned, public-domain, official-sample, creator-provided, or permission-approved content.',
  },
  {
    label: 'Do not claim yet',
    detail:
      'Do not cite package name, signing fingerprint, Android developer verification status, public screenshots, or tester-report results until the owner confirms them.',
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

const androidTranslatorProfileEvidenceRows = [
  {
    label: 'Official profiles',
    detail:
      'Treat LinkedIn, YouTube, Product Hunt, DEV, Medium, Reddit, X, Bluesky, or directory pages as official only when they link back to Nayovi-owned source URLs and use the same responsible-use language.',
  },
  {
    label: 'Review packets',
    detail:
      'Ask for the public APK source, pricing, support, OCR checklist, screenshot policy, and review-code path before relying on a directory listing or social post.',
  },
  {
    label: 'Unverified mentions',
    detail:
      'Do not treat mirrors, scraped listings, anonymous comments, vote requests, or reposted APK files as evidence that Nayovi approved a channel.',
  },
  {
    label: 'Partner checks',
    detail:
      'Creators, publishers, investors, and app reviewers should confirm the sample scope, source permission, and public citation rules before sharing screenshots or test results.',
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

const tokenPlanDecisionRows = [
  {
    label: 'One-time curiosity',
    detail:
      'Stay on the free trial when you only need to confirm install confidence, one permitted sample, and basic OCR readability.',
  },
  {
    label: 'Repeat chapters',
    detail:
      'Use a paid token plan when several sessions show that hosted OCR, translation, support, and activation are part of a recurring reading workflow.',
  },
  {
    label: 'Reviewer testing',
    detail:
      'Ask for a review code when the goal is a fair public article, directory listing, or comparison rather than personal repeat reading.',
  },
  {
    label: 'Partner pilot',
    detail:
      'Use separated pilot access when a creator, publisher, or community needs approved-sample evidence before any public recommendation.',
  },
] as const;

const tokenPlanSignals = [
  {
    title: 'Upgrade signal',
    description:
      'The reader has already tested OCR coverage, wants to process more than a sample, and values the official APK, support, and device recovery path.',
  },
  {
    title: 'Hold signal',
    description:
      'The user has not verified source permission, translation quality, language-pair fit, or whether the workflow will repeat beyond one page.',
  },
  {
    title: 'Route to support',
    description:
      'Editors, affiliates, directory reviewers, and partner teams should request review or pilot access before spending or publishing.',
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

const approvedSampleReadinessRows = [
  {
    label: 'Ready for screenshots',
    detail:
      'The sample owner, source type, allowed excerpt, and attribution note are documented before anyone shares a before-and-after image.',
  },
  {
    label: 'Ready for review access',
    detail:
      'The reviewer can preserve the official APK link, pricing context, support path, and no-chapter-hosting boundary in the public note.',
  },
  {
    label: 'Ready for partner follow-up',
    detail:
      'The test has a named feedback owner, a clear language pair, a private quality result, and a reason to continue toward paid use or a pilot.',
  },
  {
    label: 'Not ready yet',
    detail:
      'Pause when permission, screenshot scope, source links, or the expected public evidence are unclear. Use the trial privately before requesting a code.',
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

const tokenPlanContinuationRows = [
  {
    label: 'Continue',
    detail:
      'Keep the paid plan when the same reader, title, or language pair creates repeat hosted OCR work and the monthly token volume is predictable.',
  },
  {
    label: 'Adjust',
    detail:
      'Ask support before renewing when activation, device recovery, or expected page volume changed enough that the current plan no longer fits.',
  },
  {
    label: 'Review code',
    detail:
      'Move public reviewers, affiliates, and partner tests to a dedicated code instead of mixing evaluation traffic with a normal paid account.',
  },
  {
    label: 'Stop',
    detail:
      'Do not renew when the user only needed a one-off translation, cannot confirm source permission, or the approved sample did not meet the quality bar.',
  },
] as const;

const tokenPlanAttributionRows = [
  {
    label: 'Normal reader',
    detail:
      'Send direct reader demand to the public pricing page only after the trial proves repeat translation value and support expectations are clear.',
  },
  {
    label: 'Reviewer',
    detail:
      'Use a dedicated review code when an article, directory listing, or comparison page needs screenshots, attribution, or a reproducible test path.',
  },
  {
    label: 'Affiliate',
    detail:
      'Require official APK, pricing, support, cancellation, and responsible-use links before treating a referral as qualified paid traffic.',
  },
  {
    label: 'Partner pilot',
    detail:
      'Keep creator, publisher, localization, and community tests on approved samples with a separate code so pilot evidence is not mixed with normal checkout.',
  },
] as const;

const tokenPlanCommercialRows = [
  {
    label: 'Volume reader',
    detail:
      'Ask for expected pages, language pair, device count, and support needs before moving beyond the standard monthly token plans.',
  },
  {
    label: 'Public coverage',
    detail:
      'Use a dedicated review or affiliate code when a writer, directory, or community can keep official APK, pricing, support, and responsible-use links attached.',
  },
  {
    label: 'Partner use case',
    detail:
      'Keep publisher, creator, localization, and community requests on approved samples with a clear business objective before custom access or founder time is considered.',
  },
  {
    label: 'No escalation',
    detail:
      'Do not escalate vague traffic offers, paid-link requests, mirror-first listings, or unsupported catalog-processing claims as commercial opportunities.',
  },
] as const;

const tokenPlanAccessGuardrailRows = [
  {
    label: 'Discount request',
    detail:
      'Do not discount recurring access just because a contact offers traffic. Ask what approved sample, qualified install path, or paid-use signal the discount would prove.',
  },
  {
    label: 'Trial extension',
    detail:
      'Extend access only when support needs more time to resolve activation, device recovery, or a real reviewer test. One-off curiosity should stay on the normal trial path.',
  },
  {
    label: 'Partner code',
    detail:
      'Issue a separate code when the partner can report source-preserving attribution, approved-sample feedback, support load, and whether users return toward paid plans.',
  },
  {
    label: 'Decline',
    detail:
      'Decline requests that trade free access for vague promotion, hide pricing or support links, require an APK mirror, or cannot explain source permission.',
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

const pilotIntakeRows = [
  {
    label: 'Sample owner',
    detail:
      'Name the creator, publisher, reviewer, moderator, or rights holder who can approve the sample and any public citation.',
  },
  {
    label: 'Test material',
    detail:
      'List the title, page count, format, source language, target language, and whether screenshots or translated excerpts may be shared.',
  },
  {
    label: 'Evaluation goal',
    detail:
      'Choose private feedback, review-code access, affiliate testing, accessibility research, or a partner workflow conversation before spending support time.',
  },
  {
    label: 'Success signal',
    detail:
      'Record whether success means qualified Android installs, repeat paid translation intent, review coverage, an approved case note, or a next partner call.',
  },
] as const;

const pilotContactPathRows = [
  {
    label: 'Creator platform',
    detail:
      'Use the official partnership, IP, or creator-support path only after the platform confirms which department should review approved-sample workflow feedback.',
  },
  {
    label: 'Localization team',
    detail:
      'Send a no-link note first and ask whether Android-side OCR QA observations are useful for creator-controlled samples, not whether Nayovi can process client catalogs.',
  },
  {
    label: 'Reviewer or directory',
    detail:
      'Share the APK review packet, official download page, pricing, support, and screenshot policy before any code, upload, listing, or public article.',
  },
  {
    label: 'Stop condition',
    detail:
      'Do not continue when the contact path requires paid link placement, reciprocal backlinks, unauthorized page examples, fake reviews, or unclear sample ownership.',
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

const citationLadderRows = [
  {
    label: '1) Value first',
    detail:
      'Start each reply with the process checks: permission scope, OCR completeness, reading order, glossary consistency, and sharing decision.',
  },
  {
    label: '2) Link only when needed',
    detail:
      'Include official links only if the audience asks for implementation details such as official source, pricing, support, or review access.',
  },
  {
    label: '3) Keep boundaries explicit',
    detail:
      'Keep no chapter-hosting, no-catalog-processing, and rights-sensitive use explicit so reviews do not overstate official guarantees.',
  },
  {
    label: '4) Stop on risk',
    detail:
      'Pause distribution if the target requires paid placement, reciprocal links, hidden redirects, unsupported verification claims, or mirror-first APK handling.',
  },
];

const citationResourceRows = [
  {
    label: 'Primary guide',
    detail: 'https://tachiyomiat.com/guides/comic-ocr-translation-checklist',
  },
  {
    label: 'Official onboarding',
    detail: 'https://tachiyomiat.com/download',
  },
  {
    label: 'Support and pricing details',
    detail: 'https://tachiyomiat.com/pricing',
  },
  {
    label: 'Review help and pilot path',
    detail: 'https://tachiyomiat.com/guides/permission-safe-manga-translation-pilot',
  },
];

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

const checklistDistributionRows = [
  {
    label: 'Newsletter fit',
    detail:
      'Submit this checklist only as a technical resource about OCR review, approved samples, and Android trust. Do not pitch it as consumer app news unless the editor asks for product context.',
  },
  {
    label: 'Directory fit',
    detail:
      'Use AI or app directories only when they preserve the official download, pricing, support, and responsible-use links without reciprocal backlinks or mirror-first APK pages.',
  },
  {
    label: 'Community fit',
    detail:
      'For Reddit, forums, Q&A, and maintainer discussions, start with a no-link checklist summary and include a URL only when rules allow it and the link answers the question.',
  },
  {
    label: 'Partner fit',
    detail:
      'For creator platforms, publishers, and localization teams, ask for approved-sample workflow feedback instead of implying catalog processing, replacement localization, or endorsement.',
  },
] as const;

const checklistReviewerHandoffRows = [
  {
    label: 'App testers',
    detail:
      'Use this checklist to define the test task before any APK upload: official source, install path, permissions, activation, OCR coverage, support route, and screenshot rules.',
  },
  {
    label: 'AI directories',
    detail:
      'Give editors the checklist only when the listing can preserve Android APK, hosted OCR, trial plus paid-token pricing, support, and responsible-use context.',
  },
  {
    label: 'Manga media',
    detail:
      'Pitch the checklist as a visual-storytelling OCR QA resource, not as a claim that Nayovi can process catalog titles or replace licensed localization.',
  },
  {
    label: 'Research notes',
    detail:
      'Cite current manga OCR research as background for failure modes only. Do not claim dataset access, benchmark performance, or third-party endorsement.',
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

export const translationSupportWorkflowFaqs = [
  {
    title: 'What should I include in a support request?',
    description:
      'Include your Nayovi app version, Android version, language pair, the exact error, and when it happened. Share the smallest safe example needed to explain the problem.',
  },
  {
    title: 'Do I need to send a full chapter?',
    description:
      'No. Start by describing the issue. If an image is truly necessary, use one cropped panel or a small sample you are allowed to share.',
  },
  {
    title: 'Can support help with my trial, plan, or activation?',
    description:
      'Yes. The same official support page handles free-chapter access, monthly plans, billing, installation, account access, and activation questions.',
  },
  {
    title: 'How can a rights holder contact Nayovi?',
    description:
      'Use the official sources and takedown page or contact support with the work title, affected URL or feature, your relationship to the work, and a reliable contact address.',
  },
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
        titleAs="h1"
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
        eyebrow="Citation ladder"
        title="No-link-first and escalation path"
        description="This section helps keep community replies safe: add process guidance first, then add source links only if the thread needs official implementation details."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {citationLadderRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[14rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">{row.label}</span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Source pages"
        title="Official pages for link-safe follow-up"
        description="Use these URLs only when the contact asks for implementation context and publication rules allow direct links."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {citationResourceRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[14rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">{row.label}</span>
                <span className="break-words">{row.detail}</span>
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
        eyebrow="Distribution fit"
        title="Where this checklist can be shared safely"
        description="Use the checklist as a quality resource first. A Nayovi product link belongs only when the target accepts official implementation details."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {checklistDistributionRows.map((row) => (
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
        eyebrow="Reviewer handoff"
        title="How third parties can evaluate the workflow"
        description="Use this section when a tester, directory editor, newsletter writer, or manga-media contact asks what would make the checklist reviewable."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {checklistReviewerHandoffRows.map((row) => (
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

export const PageMediaKit = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Media kit"
        title="Nayovi source-of-truth packet"
        titleAs="h1"
        description="Official profile, citation, and review context for Android reviewers, app directories, podcasts, newsletters, creator platforms, localization teams, and partners."
        className="pt-10"
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-4 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            {mediaKitClaimRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-border/70 bg-background/45 px-4 py-3"
              >
                <div className="font-semibold text-foreground">{row.label}</div>
                <div className="text-muted-foreground">{row.detail}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Official links"
        title="Use these links when citing Nayovi"
        description="Keep third-party mentions pointed at source-of-truth pages so readers can verify APK access, pricing, support, sample rules, and review context."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {mediaKitSourceRows.map((row) => (
            <Card key={row.label} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.label}</CardTitle>
              </CardHeader>
              <CardContent className="break-words text-sm leading-7 text-muted-foreground">
                {row.detail}
              </CardContent>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Audience fit"
        title="What each reviewer should verify"
        description="The media kit keeps public claims narrow until assets, screenshots, package identity, and verification status are confirmed by the owner."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {mediaKitAudienceRows.map((row) => (
            <Card key={row.title} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.title}</CardTitle>
                <CardDescription>{row.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
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
        titleAs="h1"
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
        eyebrow="Partner intake"
        title="What to collect before issuing a code"
        description="A useful partner reply should arrive with enough context to decide whether Nayovi should send review access, keep the test private, or stop cleanly."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {pilotIntakeRows.map((row) => (
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
        eyebrow="Contact path"
        title="How to route partner and reviewer requests"
        description="Use the lowest-risk official path for each audience before sharing codes, screenshots, APK files, or public examples."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {pilotContactPathRows.map((row) => (
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
        titleAs="h1"
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
        eyebrow="Trust signals"
        title="Check official profiles before trusting a mention"
        description="A real Nayovi profile, listing, video, or article should point back to the same official source links and should not replace the download, pricing, support, or responsible-use pages."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {androidTranslatorProfileEvidenceRows.map((row) => (
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
        titleAs="h1"
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
        eyebrow="Readiness"
        title="Check whether a code or public note is earned"
        description="A useful review or partner pilot should preserve source links, name the allowed sample boundary, and create evidence that can be acted on after the test."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {approvedSampleReadinessRows.map((row) => (
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
        titleAs="h1"
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
        eyebrow="Renewal decision"
        title="Continue only when the plan still matches real usage"
        description="Use the first paid month or reviewer test to decide whether Nayovi should continue as recurring access, move to support, use a separate review code, or stop cleanly."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {tokenPlanContinuationRows.map((row) => (
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
        eyebrow="Attribution"
        title="Separate paid demand from review and pilot access"
        description="Use the access path that matches the source of the lead so checkout, support, attribution, and approved-sample evidence stay measurable."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            {tokenPlanAttributionRows.map((row) => (
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
        eyebrow="Commercial qualification"
        title="Escalate only measurable paid or partner demand"
        description="Warm replies and higher-volume requests should identify the usage path, attribution need, and responsible sample scope before custom terms, founder time, or review access are used."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {tokenPlanCommercialRows.map((row) => (
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
        eyebrow="Access guardrails"
        title="Protect paid signal before granting exceptions"
        description="Discounts, trial extensions, and partner codes should prove qualified demand or unblock real evaluation, not replace normal checkout for weak promotion."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            {tokenPlanAccessGuardrailRows.map((row) => (
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
        titleAs="h1"
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
        eyebrow="Review path"
        title="Checklist for reviewers, affiliates, and directories"
        description="Use the same install-to-activation sequence that a paying reader would follow, then link readers back to the official download, pricing, support, and policy pages."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {reviewerActivationChecks.map((check) => {
            const Icon = check.icon;
            return (
              <Card key={check.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{check.title}</CardTitle>
                  <CardDescription>{check.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
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

export const PageFreeTrialVsPaidTokenPlan = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Pricing decision"
        title="Free trial vs paid token plan for manga translation"
        description="Use the free trial to prove fit. Move to a monthly token plan only when hosted OCR and AI translation become a repeat Android workflow."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {tokenPlanDecisionRows.map((row) => (
            <Card key={row.label} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{row.label}</CardTitle>
                <CardDescription>{row.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Upgrade signals"
        title="Pay for repeat value, not first-click curiosity"
        description="A durable subscription signal appears after a user has tested official install confidence, translation quality, and repeat need."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {tokenPlanSignals.map((signal) => (
            <Card key={signal.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{signal.title}</CardTitle>
                <CardDescription>{signal.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Reader path"
        title="A clean path from trial to paid use"
        description="The strongest paid users arrive with a permission-safe sample, verify the Android workflow, and upgrade because they expect more translation sessions."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Start from the official APK download page so source, support,
              pricing, and responsible-use links stay attached before install.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Use the free trial to test OCR coverage, reading order, glossary
              consistency, and translation readability on permitted content.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Upgrade only when the workflow is recurring enough that monthly
              token access is more useful than one-off testing.
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Next"
        title="Choose the right access route"
        description="Readers should compare plans after a successful trial. Reviewers and partners should request a code so testing stays attributable and fair."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/pricing"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Compare plans
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/download"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Download APK
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

export const PageTranslationSupportWorkflow = () => {
  const problemDetails = [
    {
      icon: SmartphoneIcon,
      title: 'Where the problem appears',
      description:
        'Tell us whether the issue happens during installation, while opening a chapter, when detecting text, or after choosing the translation language.',
    },
    {
      icon: MessageSquareTextIcon,
      title: 'What you expected',
      description:
        'Describe what you expected to see and what happened instead. Include the exact error message when one is shown.',
    },
    {
      icon: LanguagesIcon,
      title: 'Language and reading context',
      description:
        'Share the original and target languages, and say whether you are reading manhwa, manga, or manhua on Android.',
    },
    {
      icon: BookOpenCheckIcon,
      title: 'How to reproduce it',
      description:
        'List the shortest steps that make the issue happen again so support can check the same workflow.',
    },
  ] as const;

  const diagnosticRows = [
    {
      label: 'App and Android',
      detail:
        'Include the Nayovi version, Android version, and device model. These details often explain installation or display differences.',
    },
    {
      label: 'Translation context',
      detail:
        'Include the source language, target language, page number, and whether the problem affects one page or the whole chapter.',
    },
    {
      label: 'Error and timing',
      detail:
        'Copy the exact error text and give the approximate time it happened. This helps support find the matching request.',
    },
    {
      label: 'Small screenshot',
      detail:
        'Attach a cropped screenshot only when it makes the issue clearer. Hide email addresses, activation codes, payment details, and other private information.',
    },
  ] as const;

  const responseSteps = [
    {
      title: 'Your request is reviewed',
      description:
        'Support checks the details and identifies whether the issue concerns the app, OCR, translation, account access, or billing.',
    },
    {
      title: 'We may ask one follow-up question',
      description:
        'If the issue cannot be reproduced safely, support may ask for an app version, exact error, or a smaller approved sample.',
    },
    {
      title: 'You receive the next useful action',
      description:
        'The reply may include setup steps, an account check, plan guidance, or confirmation that a translation issue needs more investigation.',
    },
  ] as const;

  const helpTopics = [
    {
      title: 'Free chapters and trial access',
      description:
        'Ask what is included, why trial access is not appearing, or how to start testing Nayovi before choosing a plan.',
    },
    {
      title: 'Monthly plans and billing',
      description:
        'Include the billing email and a non-sensitive payment reference when support needs to locate a purchase. Never post payment details publicly.',
    },
    {
      title: 'Account or activation',
      description:
        'Share the app version and error message, but keep activation codes and private account details out of screenshots and public messages.',
    },
  ] as const;

  return (
    <PublicShell>
      <PublicSection
        eyebrow="Nayovi support"
        title="Get help with Nayovi manhwa translation"
        titleAs="h1"
        description="A simple support workflow for Android readers who need help with manhwa, manga, or manhua translation, text detection, installation, trial access, or a monthly plan."
        className="pt-10"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {problemDetails.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
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
        eyebrow="Useful details"
        title="Share only what support needs"
        description="A short, precise report is usually more useful than a long upload and helps us understand the translation problem faster."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {diagnosticRows.map((row) => (
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
        eyebrow="Privacy and rights"
        title="Protect the chapter and your account"
        description="Start by describing the issue. You usually do not need to upload copyrighted pages or private account information."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: 'Do not send a full chapter',
              description:
                'If an image is truly necessary, send one cropped panel or a small approved sample instead of a complete chapter.',
            },
            {
              title: 'Use content you can access legally',
              description:
                'Only share content you own, public-domain material, an official sample, or pages you have permission to process.',
            },
            {
              title: 'Remove private information',
              description:
                'Hide email addresses, activation codes, receipts, payment details, and other identifiers before attaching a screenshot.',
            },
          ].map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                  <ShieldCheckIcon className="size-5" />
                </div>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="After you contact us"
        title="What happens after you send a request"
        description="Response time depends on the issue and the details available. Translation problems may take longer when they need a safe, reproducible sample."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {responseSteps.map((step, index) => (
            <Card key={step.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Access help"
        title="Help with trials, plans, and accounts"
        description="Use the same official support page for free-chapter access, monthly subscriptions, billing questions, installation, and activation."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {helpTopics.map((topic) => (
            <Card key={topic.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{topic.title}</CardTitle>
                <CardDescription>{topic.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/pricing"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            See monthly plans
          </a>
          <a
            href="/download"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Installation guide
          </a>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Official contact"
        title="Contact Nayovi support"
        description="Send your request through the official support page so translation, Android, plan, and account questions reach the right place."
        className="pb-20"
      >
        <div className="public-brand-panel-muted flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border p-5 md:p-6">
          <div className="max-w-2xl space-y-1">
            <p className="font-medium text-brand-950 dark:text-brand-100">
              Include the problem, device details, language pair, and the
              smallest safe example needed to explain it.
            </p>
            <p className="text-sm text-muted-foreground">
              Do not include a full chapter, password, activation code, or
              payment details.
            </p>
          </div>
          <a
            href="/support"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Contact support
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageManhwaOcrGlossaryChecklist = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="OCR checklist"
        title="Manhwa OCR glossary checklist"
        titleAs="h1"
        description="A reviewer-ready checklist for approved manhwa samples before Nayovi output is cited, shared with partners, or used to judge paid translation fit."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {glossaryChecklistRows.map((row) => (
            <Card key={row.checkpoint} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{row.checkpoint}</CardTitle>
                <CardDescription>{row.reviewerQuestion}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-muted-foreground">
                {row.partnerSignal}
              </CardContent>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Partner use"
        title="Use it before review codes or pilots"
        description="The checklist gives Android reviewers, manga communities, localization teams, and creator platforms a shared quality bar for permission-safe tests."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Start with owned, public-domain, official-sample, or
              permission-approved pages so the review stays safe to discuss.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Record terminology decisions before expanding a test to more
              pages, reviewers, affiliates, or community members.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Measure qualified installs, review-code activation, support
              questions, and repeat token-plan intent after the sample quality
              is clear.
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Next"
        title="Continue to the full workflow"
        description="Use the broader workflow page when a reviewer, directory, or partner needs setup, permission boundaries, and takedown-ready handling."
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
            href="/translate-manhwa-ai"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Manhwa AI page
          </a>
          <a
            href="/#contact"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Request review code
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
        titleAs="h1"
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
