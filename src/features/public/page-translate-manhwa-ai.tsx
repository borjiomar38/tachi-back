import {
  ArrowRightIcon,
  BadgeCheckIcon,
  DownloadIcon,
  HandshakeIcon,
  KeyRoundIcon,
  LanguagesIcon,
  ScanTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import heroBackground from '@/features/auth/layout-login-background.webp';
import heroCharacter from '@/features/auth/layout-login-character.webp';
import { androidApkDownload } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

const benefits = [
  {
    title: 'Manhwa-first page flow',
    description:
      'Built for long vertical pages, speech bubbles, narration boxes, and dense panel layouts.',
    icon: ScanTextIcon,
  },
  {
    title: 'AI translation support',
    description:
      'Hosted OCR and AI translation help keep names, terms, and short dialogue readable.',
    icon: LanguagesIcon,
  },
  {
    title: 'Android app workflow',
    description:
      'Install the APK, activate with a redeem code, and translate from a TachiyomiAT, Tachiyomi, or Mihon-style reader workflow.',
    icon: KeyRoundIcon,
  },
] as const;

const workflowSteps = [
  {
    title: 'Download Nayovi',
    description:
      'Install the Android APK from the official Nayovi website.',
    icon: DownloadIcon,
  },
  {
    title: 'Activate hosted mode',
    description:
      'Use a redeem code to unlock hosted OCR and AI translation access.',
    icon: BadgeCheckIcon,
  },
  {
    title: 'Translate manhwa pages',
    description:
      'Send page text through the hosted translation flow and continue reading.',
    icon: SparklesIcon,
  },
] as const;

const comparisonRows = [
  {
    need: 'Android reader workflow',
    nayovi: 'Official APK, redeem-code activation, and hosted translation stay connected.',
    generic:
      'Browser tools usually require screenshots, copy-paste steps, or separate upload flows.',
  },
  {
    need: 'Manhwa page handling',
    nayovi:
      'Hosted OCR is positioned around vertical pages, short dialogue, and dense panels.',
    generic:
      'General OCR tools often treat pages as documents instead of reader layouts.',
  },
  {
    need: 'Paid support signal',
    nayovi:
      'Token plans, support, and activation give serious readers a direct upgrade path.',
    generic:
      'Free web tools rarely include app support, account recovery, or usage controls.',
  },
] as const;

const intentRows = [
  {
    search: 'Translate Korean manhwa on Android',
    fit: 'Best fit when readers need vertical-page OCR, short-dialogue translation, and one APK-to-plan flow.',
    action: 'Start with the free trial, then move to Pro if translation becomes a weekly reading habit.',
  },
  {
    search: 'Translate manga or manhua from a reader app',
    fit: 'Useful when the reading workflow already feels like TachiyomiAT, Tachiyomi, or Mihon and screenshots feel slow.',
    action: 'Download the official APK and keep pricing, support, and activation on Nayovi instead of using mirrors.',
  },
  {
    search: 'Review, affiliate, or community test',
    fit: 'Good fit when a blog, community, or partner needs a review code, public pricing page, and compliance note.',
    action: 'Request a dedicated code before publishing a walkthrough or sending readers to a trial.',
  },
] as const;

const reviewSignals = [
  {
    title: 'Reviewer-ready flow',
    description:
      'The official APK, pricing page, support path, and setup guides give blogs and communities a clear product path to evaluate.',
  },
  {
    title: 'Affiliate-friendly upgrade path',
    description:
      'Free trial access lets readers test the workflow before monthly token plans create a direct subscription signal.',
  },
  {
    title: 'Permission-safe positioning',
    description:
      'Nayovi focuses on OCR, translation support, activation, and reader workflow instead of hosting or distributing chapters.',
  },
] as const;

const reviewRequestRows = [
  {
    audience: 'Android app reviewers',
    request:
      'Ask for a redeem code, APK link, screenshots, pricing context, and the permission-safe workflow note before testing.',
  },
  {
    audience: 'Affiliate or community pilots',
    request:
      'Request a dedicated code and point members to the official download, pricing, support, and cancellation paths.',
  },
  {
    audience: 'Localization or publisher teams',
    request:
      'Start with approved samples or public-domain material so the OCR and translation workflow can be reviewed responsibly.',
  },
] as const;

const disclosureRows = [
  {
    title: 'Review code terms',
    description:
      'Reviewers can request a time-limited redeem code for hands-on testing without promising coverage, ranking, or a positive article.',
  },
  {
    title: 'Affiliate clarity',
    description:
      'Any affiliate pilot should disclose the relationship and send readers to the official download, pricing, and support paths.',
  },
  {
    title: 'Measurable outcome',
    description:
      'A useful test should track qualified installs, trial activation, and repeat token-plan intent instead of only raw clicks.',
  },
] as const;

const demoEvaluationRows = [
  {
    checkpoint: 'Original page to English result',
    signal:
      'The current narrated demo shows original Chinese content, language selection, translation progress, and the final English result in one Android flow.',
  },
  {
    checkpoint: 'Reader workflow continuity',
    signal:
      'Reviewers can inspect the hosted translation path without asking readers to upload pages to a generic web tool or manage provider API keys.',
  },
  {
    checkpoint: 'Reviewer-ready proof',
    signal:
      'Narration, subtitles, a presenter avatar, and a compressed wait section make the workflow easier to evaluate before requesting a review code.',
  },
] as const;

const partnerUseCases = [
  {
    useCase: 'Approved sample chapters',
    value:
      'Publishers, reviewers, or creators can test OCR and translation on approved previews before discussing a public workflow.',
  },
  {
    useCase: 'Accessibility and reader research',
    value:
      'Teams can evaluate whether hosted OCR makes short dialogue and vertical-page context easier to inspect for multilingual readers.',
  },
  {
    useCase: 'Affiliate or reviewer pilots',
    value:
      'Partners can use dedicated codes, official APK links, and pricing context to measure qualified installs without sending readers to mirrors.',
  },
] as const;

const pilotReadinessRows = [
  {
    checkpoint: 'Approved material first',
    detail:
      'A publisher, community, or reviewer should define the sample pages, rights context, and language pair before Nayovi is tested publicly.',
  },
  {
    checkpoint: 'Dedicated access path',
    detail:
      'Use a review or pilot redeem code so trial usage, support questions, and conversion quality can be separated from normal readers.',
  },
  {
    checkpoint: 'Revenue signal after proof',
    detail:
      'Expand only when the pilot shows repeat translation need, qualified installs, or a clear path to paid token-plan usage.',
  },
] as const;

const directoryReadinessRows = [
  {
    signal: 'Official APK source',
    detail:
      'Directory visitors should land on Nayovi for the current Android APK, setup guidance, pricing, and support instead of an unofficial mirror.',
  },
  {
    signal: 'Transparent app metadata',
    detail:
      'Reviewers can cite the hosted OCR workflow, redeem-code activation, free trial, token plans, and support policy in one place.',
  },
  {
    signal: 'Responsible usage note',
    detail:
      'Listings should describe Nayovi as translation support for owned, public-domain, official-sample, or permission-approved content.',
  },
] as const;

const storeReadinessRows = [
  {
    requirement: 'Developer-owned listing',
    detail:
      'Alternative stores should list Nayovi only from the official developer path, with tachiyomiat.com and nayovi.com kept as the source of truth.',
  },
  {
    requirement: 'Install decision context',
    detail:
      'The listing should make the free trial, redeem-code activation, monthly token plans, and support route clear before readers install.',
  },
  {
    requirement: 'No mirror-first funnel',
    detail:
      'Nayovi should use app stores for qualified discovery while still sending trust, pricing, and support questions back to the official site.',
  },
] as const;

const proofRows = [
  {
    signal: 'Before installing',
    proof:
      'Readers can inspect the official APK path, pricing page, setup guides, and support route before trusting the workflow.',
  },
  {
    signal: 'Before paying',
    proof:
      'Free trial access and chapter estimates make the upgrade decision tied to real manga, manhwa, or manhua reading volume.',
  },
  {
    signal: 'Before publishing',
    proof:
      'Reviewers can request a redeem code and cite the permission-safe policy instead of sending readers to an unofficial mirror.',
  },
] as const;

const citationRows = [
  {
    field: 'Product summary',
    value:
      'Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua readers.',
  },
  {
    field: 'Best-fit audience',
    value:
      'Android readers, app reviewers, affiliates, and communities that need a TachiyomiAT, Tachiyomi, or Mihon-style translation path.',
  },
  {
    field: 'Responsible use',
    value:
      'Use Nayovi with owned content, public-domain material, official samples, or content the reader has permission to process.',
  },
] as const;

const installConfidenceRows = [
  {
    concern: 'Is this the real app?',
    answer:
      'Use tachiyomiat.com or nayovi.com as the source of truth for the current APK, support route, pricing, and redeem-code activation.',
  },
  {
    concern: 'Will the trial prove enough?',
    answer:
      'Start with free trial access, test real page flow, then choose a token plan only when repeat translation volume is clear.',
  },
  {
    concern: 'Can reviewers cite it responsibly?',
    answer:
      'Reference hosted OCR and translation support for owned, public-domain, official-sample, or permission-approved content.',
  },
] as const;

const subscriptionIntentRows = [
  {
    intent: 'Weekly manhwa translation',
    signal:
      'The reader already has repeat chapters to process and needs hosted OCR, clean text, and a stable Android workflow.',
    nextStep:
      'Start with the free trial, then compare token plans once the same title or reading habit becomes recurring.',
  },
  {
    intent: 'Reviewer or affiliate test',
    signal:
      'The publisher needs screenshots, demo proof, pricing context, and a review code before recommending the workflow.',
    nextStep:
      'Request a dedicated code and link readers to the official download, pricing, and support paths.',
  },
  {
    intent: 'Community or group use',
    signal:
      'A moderator, club, or language-learning group wants a controlled trial without sending members to mirrors.',
    nextStep:
      'Define the approved material, responsible-use note, and success metric before expanding beyond a small pilot.',
  },
] as const;

const directoryFitRows = [
  {
    question: 'Can free-trial users evaluate it?',
    answer:
      'Yes. A listing should mention free trial access before monthly token plans so readers can test real page flow first.',
  },
  {
    question: 'Is the app source verifiable?',
    answer:
      'Yes. Direct users to tachiyomiat.com or nayovi.com for the current APK, support, pricing, and activation details.',
  },
  {
    question: 'Does it avoid chapter hosting?',
    answer:
      'Yes. Nayovi is positioned as OCR and translation support for owned, public-domain, official-sample, or permission-approved content.',
  },
] as const;

const conversionEvidenceRows = [
  {
    checkpoint: 'Qualified install',
    detail:
      'Readers arrive from an official listing, understand the APK source, and start with free trial access instead of a blind mirror download.',
  },
  {
    checkpoint: 'Activated test',
    detail:
      'A reviewer, affiliate, or reader uses a redeem code or trial flow to inspect real hosted OCR and AI translation on approved material.',
  },
  {
    checkpoint: 'Paid repeat use',
    detail:
      'The strongest revenue signal is a reader upgrading because the same Android translation workflow is useful across repeat chapters.',
  },
] as const;

const partnerMetricRows = [
  {
    metric: 'Install-to-trial quality',
    detail:
      'Useful partner traffic should produce readers who understand the official APK source, responsible-use note, and free trial before asking for support.',
  },
  {
    metric: 'Trial-to-activation intent',
    detail:
      'Review codes, affiliate codes, and community pilots should separate serious testers from generic visitors before any paid plan is promoted.',
  },
  {
    metric: 'Repeat-token demand',
    detail:
      'The strongest partnership outcome is a reader returning for more translated pages because hosted OCR and Android workflow continuity saved time.',
  },
] as const;

const sourceHandoffRows = [
  {
    moment: 'Directory discovery',
    action:
      'Readers should see Nayovi described as an official Android APK with hosted OCR, free trial access, token plans, and support from Nayovi.',
  },
  {
    moment: 'First install decision',
    action:
      'The listing should point trust questions back to tachiyomiat.com or nayovi.com instead of treating the APK as a standalone file.',
  },
  {
    moment: 'Upgrade decision',
    action:
      'Readers should compare pricing, activation, support, and responsible-use notes on the official site before choosing a monthly token plan.',
  },
] as const;

const submissionPacketRows = [
  {
    item: 'Listing description',
    detail:
      'Describe Nayovi as an official Android APK with hosted OCR, AI translation, free trial access, redeem-code activation, token plans, and support.',
  },
  {
    item: 'Trust links',
    detail:
      'Use tachiyomiat.com and nayovi.com as source-of-truth links for APK details, pricing, support, privacy, terms, and responsible-use guidance.',
  },
  {
    item: 'Review assets',
    detail:
      'Provide screenshots, the narrated demo, package metadata, compatibility details, and a short note that Nayovi does not host or distribute chapters.',
  },
] as const;

const faqs = [
  {
    title: 'Is Nayovi a free manhwa AI translator?',
    description:
      'Nayovi offers free trial access for testing manga, manhwa, and manhua AI translation, with monthly token plans for heavier use.',
  },
  {
    title: 'Does Nayovi translate manga and manhua too?',
    description:
      'Yes. The same hosted OCR and AI translation workflow is designed for manga, manhwa, and manhua reading tasks.',
  },
  {
    title: 'Does Nayovi host manhwa chapters?',
    description:
      'No. Nayovi provides app setup, hosted OCR, translation support, activation, and support workflows. It does not publish or distribute chapters.',
  },
  {
    title: 'Is this for TachiyomiAT, Tachiyomi, or Mihon readers?',
    description:
      'Yes. Nayovi keeps the Android reading workflow familiar for people searching TachiyomiAT, Tachiyomi, or Mihon, then adds hosted OCR, AI translation, redeem-code activation, and support.',
  },
] as const;

export const translateManhwaAiFaqs = faqs;

export const PageTranslateManhwaAi = () => {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-7 pb-10 md:pt-10 md:pb-14">
        <div className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 px-5 py-7 text-neutral-50 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.75)] ring-1 ring-black/10 sm:px-7 md:min-h-[34rem] md:px-10 md:py-10">
          <img
            src={heroBackground}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral-950 via-neutral-950/84 to-neutral-950/30" />
          <div className="absolute inset-0 -z-10 bg-linear-to-t from-neutral-950 via-neutral-950/20 to-neutral-950/20" />
          <img
            src={heroCharacter}
            alt=""
            className="animate-float-in-space pointer-events-none absolute right-[-7rem] bottom-[-8rem] z-0 hidden w-[min(36rem,46%)] drop-shadow-[0_30px_56px_rgba(0,0,0,0.55)] md:block lg:right-[-4rem]"
          />

          <div className="relative z-10 flex max-w-3xl flex-col gap-7 md:min-h-[29rem] md:justify-center">
            <Badge
              variant="brand"
              size="lg"
              className="border-white/15 bg-white/10 text-neutral-50 backdrop-blur"
            >
              AI manhwa translator for Android
            </Badge>

            <div className="space-y-5">
              <p className="text-sm font-semibold tracking-[0.22em] text-brand-100 uppercase">
                Translate manhwa with hosted OCR
              </p>
              <h1 className="max-w-3xl text-4xl leading-[1.03] font-semibold tracking-normal text-balance md:text-6xl">
                Translate manhwa with AI in Nayovi.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                Nayovi helps Android readers use hosted OCR and AI
                translation for manhwa, manga, and manhua pages while keeping
                the official app download, activation, and support flow in one
                place. It also preserves the path for readers searching
                TachiyomiAT, Tachiyomi, or Mihon translation workflows.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={androidApkDownload.href}
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'min-h-11 bg-brand-300 text-brand-950 hover:bg-brand-200'
                )}
              >
                <span className="flex items-center gap-2">
                  Download Android APK
                  <DownloadIcon className="size-4" />
                </span>
              </a>
              <a
                href="/pricing"
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'lg' }),
                  'min-h-11 border-white/20 bg-white/10 text-neutral-50 hover:bg-white/15'
                )}
              >
                <span className="flex items-center gap-2">
                  View token plans
                  <ArrowRightIcon className="size-4" />
                </span>
              </a>
            </div>

            <div className="grid max-w-2xl gap-2 text-sm text-neutral-200 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                <p className="font-semibold text-neutral-50">Manhwa</p>
                <p className="mt-1 text-neutral-300">Vertical pages</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                <p className="font-semibold text-neutral-50">Hosted OCR</p>
                <p className="mt-1 text-neutral-300">Clean detection</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 backdrop-blur">
                <p className="font-semibold text-neutral-50">AI translate</p>
                <p className="mt-1 text-neutral-300">Reader-friendly text</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PublicSection
        eyebrow="Why Nayovi"
        title="A focused workflow for manhwa translation"
        description="Readers searching for a manhwa AI translator usually need clean text detection, consistent translation, and a simple Android path instead of a scattered setup."
        className="pt-0"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <Card key={benefit.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Flow"
        title="From APK to translated pages"
        description="The public website handles download, plans, and support. The Android app handles the reading and translation workflow."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {workflowSteps.map((step) => {
            const Icon = step.icon;

            return (
              <Card
                key={step.title}
                className="public-brand-panel-muted rounded-[1.5rem]"
              >
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheckIcon className="size-4" />
                Permission-safe translation support
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Nayovi is a translator workflow, not a chapter host. Use it
                with content you own, public-domain material, official samples,
                or content you have permission to process.
              </p>
            </div>
            <a
              href="/guides/translation-support-workflow"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Read workflow guide
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Comparison"
        title="Why readers choose Nayovi instead of generic translators"
        description="The best-fit user is not just looking for an AI translation demo. They need an Android workflow that can turn high-intent manga and manhwa translation searches into repeat usage."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {comparisonRows.map((row) => (
            <Card key={row.need} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.need}</CardTitle>
                <CardDescription>
                  <span className="block font-medium text-foreground">
                    Nayovi
                  </span>
                  <span className="mt-1 block">{row.nayovi}</span>
                  <span className="mt-4 block font-medium text-foreground">
                    Generic translator
                  </span>
                  <span className="mt-1 block">{row.generic}</span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Search intent"
        title="Match the workflow before choosing a plan"
        description="Nayovi should earn subscriptions from readers who need repeat translation, not one-off curiosity clicks. These are the highest-fit use cases."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {intentRows.map((row) => (
            <Card key={row.search} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.search}</CardTitle>
                <CardDescription>
                  <span className="block font-medium text-foreground">
                    Fit signal
                  </span>
                  <span className="mt-1 block">{row.fit}</span>
                  <span className="mt-4 block font-medium text-foreground">
                    Next step
                  </span>
                  <span className="mt-1 block">{row.action}</span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <KeyRoundIcon className="size-4" />
                Built around activation, not anonymous uploads
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                The best path is to install the official APK, test hosted
                translation with free access, and upgrade only when the token
                plan matches real reading volume.
              </p>
            </div>
            <a
              href="/pricing"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Compare plans
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="App listings"
        title="What app directories and reviewers can verify"
        description="Nayovi is best listed as an official Android workflow with hosted OCR, paid activation, and clear support instead of another anonymous file mirror."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {directoryReadinessRows.map((row) => (
            <Card key={row.signal} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.signal}</CardTitle>
                <CardDescription>{row.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <DownloadIcon className="size-4" />
                Built for high-intent APK traffic
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                A useful listing should send readers to the official download
                and explain why hosted translation, activation, and token plans
                matter before they install.
              </p>
            </div>
            <a
              href="/download"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Check APK details
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Alternative stores"
        title="Ready for official Android store submissions"
        description="Nayovi can pursue qualified Android discovery without turning the product into an anonymous APK mirror. The right listing keeps ownership, support, and pricing verifiable."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {storeReadinessRows.map((row) => (
            <Card key={row.requirement} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.requirement}</CardTitle>
                <CardDescription>{row.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <BadgeCheckIcon className="size-4" />
                Submission-first, mirror-last
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                A responsible alternative-store listing should verify developer
                ownership, show accurate app metadata, and preserve the
                official download, pricing, and support path for paid users.
              </p>
            </div>
            <a
              href="/download"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Review APK details
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Buyer proof"
        title="Clear checkpoints before readers commit"
        description="Qualified traffic should know what can be verified before installing, paying, or recommending Nayovi to another Android reader."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {proofRows.map((row) => (
            <Card key={row.signal} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.signal}</CardTitle>
                <CardDescription>{row.proof}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheckIcon className="size-4" />
                Useful for serious readers and reviewers
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                The best Nayovi user can verify the official download,
                activation path, support options, and plan fit before turning
                hosted translation into a repeat paid workflow.
              </p>
            </div>
            <a
              href="/download"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Verify download path
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Citation ready"
        title="Short facts for listings and articles"
        description="Directories, Android blogs, affiliates, and community moderators can cite Nayovi consistently without guessing what the product does or what usage it supports."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {citationRows.map((row) => (
            <Card key={row.field} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.field}</CardTitle>
                <CardDescription>{row.value}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <BadgeCheckIcon className="size-4" />
                Best citation path
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Link readers to the official download or pricing page, mention
                the free trial before paid token plans, and request a review
                code when testing the hosted translation workflow publicly.
              </p>
            </div>
            <a
              href="/#contact"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Request citation details
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Install confidence"
        title="Reduce risk before downloading the APK"
        description="High-intent Android readers, directory editors, and reviewers need a short trust path before they install or recommend a manga translation APK."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {installConfidenceRows.map((row) => (
            <Card key={row.concern} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.concern}</CardTitle>
                <CardDescription>{row.answer}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ShieldCheckIcon className="size-4" />
                Official source, trial, then plan
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                The strongest conversion path is not a mirror download. It is
                an official APK, free trial, visible pricing, support, and a
                responsible translation-use note that reviewers can verify.
              </p>
            </div>
            <a
              href="/download"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Open official download
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Subscription fit"
        title="When Nayovi is worth a paid plan"
        description="The best conversion signal is repeat translation need. Nayovi should upgrade readers, reviewers, and small communities only when hosted OCR and Android support become part of a real workflow."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {subscriptionIntentRows.map((row) => (
            <Card key={row.intent} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.intent}</CardTitle>
                <CardDescription>
                  <span className="block font-medium text-foreground">
                    Paid signal
                  </span>
                  <span className="mt-1 block">{row.signal}</span>
                  <span className="mt-4 block font-medium text-foreground">
                    Next step
                  </span>
                  <span className="mt-1 block">{row.nextStep}</span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <SparklesIcon className="size-4" />
                Trial first, paid when repeat usage is clear
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Nayovi is strongest when the reader can verify translation
                quality in the free trial, then choose a monthly token plan
                because the same workflow saves time across repeat chapters.
              </p>
            </div>
            <a
              href="/pricing"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Choose a plan
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Directory fit"
        title="Questions app directories should answer before listing Nayovi"
        description="The most useful Android directory placement qualifies readers before install: official source, free-trial access, paid plan context, and responsible translation use."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {directoryFitRows.map((row) => (
            <Card key={row.question} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.question}</CardTitle>
                <CardDescription>{row.answer}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <BadgeCheckIcon className="size-4" />
                List the product, not a loose APK
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Directory editors should cite the hosted OCR workflow, free
                trial, token plans, and official support path so qualified
                readers understand the subscription before they install.
              </p>
            </div>
            <a
              href="/pricing"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Review pricing context
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Conversion proof"
        title="What a useful listing should measure after the click"
        description="Nayovi should treat directories, reviews, and affiliates as qualified subscription channels. The useful signal is not a raw visit; it is install confidence, activation, and repeat paid translation need."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {conversionEvidenceRows.map((row) => (
            <Card key={row.checkpoint} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.checkpoint}</CardTitle>
                <CardDescription>{row.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ArrowRightIcon className="size-4" />
                Track the path from listing to plan fit
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                A high-quality partner mention should point readers to the
                official APK, explain the free trial, and make monthly token
                plans visible before they need more recurring translation
                volume.
              </p>
            </div>
            <a
              href="/pricing"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Review plan fit
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Partner metrics"
        title="Measure partner traffic by paid-intent signals"
        description="Nayovi should prioritize directories, reviewers, affiliates, and communities that can send qualified readers into the official APK, trial, activation, and token-plan funnel."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {partnerMetricRows.map((row) => (
            <Card key={row.metric} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.metric}</CardTitle>
                <CardDescription>{row.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <HandshakeIcon className="size-4" />
                Partner mentions should qualify subscribers
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                A good review, listing, or pilot should make the free trial,
                review-code path, support route, and monthly token plans clear
                before sending readers who need repeat manga, manhwa, or
                manhua translation.
              </p>
            </div>
            <a
              href="/support"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Request partner access
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Source of truth"
        title="Keep directory traffic connected to Nayovi"
        description="Alternative Android listings can help discovery, but the paid subscription path should stay anchored to the official site, support route, and activation flow."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {sourceHandoffRows.map((row) => (
            <Card key={row.moment} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.moment}</CardTitle>
                <CardDescription>{row.action}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <KeyRoundIcon className="size-4" />
                Discovery should lead to activation
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                A strong app-directory mention should not stop at a download.
                It should send qualified readers into the official free trial,
                redeem-code activation, support, and monthly token-plan path.
              </p>
            </div>
            <a
              href="/pricing"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Review activation path
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Submission packet"
        title="What directories need before approving Nayovi"
        description="App directories and review sites convert better when the listing packet explains the app, the official source, and the paid activation path before a reader installs."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {submissionPacketRows.map((row) => (
            <Card key={row.item} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.item}</CardTitle>
                <CardDescription>{row.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <BadgeCheckIcon className="size-4" />
                Built for approval and qualified installs
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                A good submission should make it easy for editors to verify
                ownership, cite the current APK, and send readers toward the
                official free trial, activation, support, and token-plan
                workflow.
              </p>
            </div>
            <a
              href="/support"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Request listing assets
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Demo quality"
        title="What the current Nayovi demo proves"
        description="The preferred narrated demo is built for reviewers, partners, and directories that need to understand the real Android translation workflow before asking for a review code."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {demoEvaluationRows.map((row) => (
            <Card key={row.checkpoint} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{row.checkpoint}</CardTitle>
                <CardDescription>{row.signal}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <ScanTextIcon className="size-4" />
                Built for demo follow-up
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                The current demo asset shows the original chapter, language
                choice, hosted translation/loading flow, and English result.
                Reviewers can request it with screenshots, pricing context, and
                a permission-safe workflow note before publishing.
              </p>
            </div>
            <a
              href="/#contact"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Request demo assets
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Partner use cases"
        title="Permission-safe reasons to test Nayovi"
        description="The strongest partner conversations start with approved material, transparent testing, and a clear path from review access to paid reader demand."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {partnerUseCases.map((useCase) => (
            <Card key={useCase.useCase} className="rounded-[1.5rem]">
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <HandshakeIcon className="size-5" />
                </div>
                <CardTitle className="text-lg">{useCase.useCase}</CardTitle>
                <CardDescription>{useCase.value}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <BadgeCheckIcon className="size-4" />
                Designed for accountable pilots
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                A serious pilot should name the approved source material, use a
                dedicated review or affiliate code, and measure whether trial
                users become repeat token-plan subscribers.
              </p>
            </div>
            <a
              href="/#contact"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Discuss a pilot
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Pilot readiness"
        title="A cleaner path for communities and publisher conversations"
        description="Nayovi should avoid vague AI translation pitches. The strongest pilot starts with approved pages, dedicated access, and a measurable reason to continue."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {pilotReadinessRows.map((row) => (
            <Card key={row.checkpoint} className="rounded-[1.5rem]">
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <ShieldCheckIcon className="size-5" />
                </div>
                <CardTitle className="text-lg">{row.checkpoint}</CardTitle>
                <CardDescription>{row.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <HandshakeIcon className="size-4" />
                Built for accountable tests
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                A useful partner test should name the approved source material,
                define the support route, and decide in advance whether success
                means review coverage, affiliate conversion, or paid reader
                activation.
              </p>
            </div>
            <a
              href="/support"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Request pilot access
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="For partners"
        title="Built for reviews, demos, and community tests"
        description="Nayovi gives affiliates, Android blogs, and manga communities a concrete flow to inspect: official download, free trial, token plans, support, and a clear permission-safe use policy."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {reviewSignals.map((signal) => (
            <Card
              key={signal.title}
              className="public-brand-panel-muted rounded-[1.5rem]"
            >
              <CardHeader>
                <CardTitle className="text-lg">{signal.title}</CardTitle>
                <CardDescription>{signal.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <BadgeCheckIcon className="size-4" />
                Review access without API-key setup
              </div>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                Bloggers, communities, and affiliates can test the Android
                workflow through a redeem code, compare the public pricing
                page, and link readers to the official APK instead of an
                unofficial mirror.
              </p>
            </div>
            <a
              href="/#contact"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Request review code
            </a>
          </CardContent>
        </Card>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-lg">
              Disclosure rules for review and affiliate tests
            </CardTitle>
            <CardDescription>
              Nayovi should win qualified coverage through a useful workflow,
              clear review access, and transparent partner terms.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 lg:grid-cols-3">
            {disclosureRows.map((row) => (
              <div
                key={row.title}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <p className="text-sm font-semibold">{row.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {row.description}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardHeader>
            <CardTitle className="text-lg">
              What partners should request before publishing
            </CardTitle>
            <CardDescription>
              A review or pilot should send qualified readers to the official
              Nayovi funnel and keep the use case transparent.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 pt-0 lg:grid-cols-3">
            {reviewRequestRows.map((row) => (
              <div
                key={row.audience}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <p className="text-sm font-semibold">{row.audience}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {row.request}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        id="faq"
        eyebrow="FAQ"
        title="Manhwa AI translator questions"
        description="Quick answers for readers comparing Nayovi with generic manga or manhwa translation tools."
        className="pb-20"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {faqs.map((faq) => (
            <Card key={faq.title} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{faq.title}</CardTitle>
                <CardDescription>{faq.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="public-brand-panel mt-4 rounded-[1.5rem] text-neutral-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="space-y-1">
              <p className="font-medium">Ready to try Nayovi?</p>
              <p className="text-sm text-neutral-300">
                Download the Android APK or compare token plans before
                activating hosted translation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={androidApkDownload.href}
                className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
              >
                <span className="flex items-center gap-2">
                  Download APK
                  <DownloadIcon className="size-4" />
                </span>
              </a>
              <a
                href="/pricing"
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                See plans
              </a>
            </div>
          </CardContent>
        </Card>
      </PublicSection>
    </PublicShell>
  );
};
