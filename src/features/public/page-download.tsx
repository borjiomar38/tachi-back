import {
  ArrowRightIcon,
  BadgeCheckIcon,
  ClipboardCheckIcon,
  DownloadIcon,
  FingerprintIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
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

import { DemoVideo } from '@/features/public/demo-video';
import { androidApkDownload } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

const verificationRows = [
  {
    title: 'Official source links',
    description:
      'Use tachiyomiat.com and nayovi.com for APK details, pricing, support, privacy, terms, and responsible-use notes.',
  },
  {
    title: 'Review access',
    description:
      'Ask for a redeem code, screenshots, narrated demo context, and package metadata before publishing a hands-on review.',
  },
  {
    title: 'Usage boundary',
    description:
      'Describe Nayovi as hosted OCR and translation support for owned, public-domain, official-sample, or permission-approved content.',
  },
] as const;

const appMetadataRows = [
  {
    label: 'File name',
    value: androidApkDownload.filename,
  },
  {
    label: 'Build',
    value: androidApkDownload.buildLabel,
  },
  {
    label: 'APK size',
    value: androidApkDownload.sizeLabel,
  },
  {
    label: 'SHA-256',
    value: androidApkDownload.sha256,
  },
] as const;

const trustRows = [
  {
    title: 'Start from the owned domain',
    description:
      'Use tachiyomiat.com or nayovi.com as the source of truth before installing or reviewing an APK from any directory listing.',
  },
  {
    title: 'Match the published hash',
    description:
      'Compare the SHA-256 value on this page with the downloaded file before citing, mirroring, or reviewing the build.',
  },
  {
    title: 'Keep support and policy links attached',
    description:
      'A trustworthy listing should include support, pricing, privacy, terms, and the responsible translation workflow guide.',
  },
  {
    title: 'Record signing and verification status',
    description:
      'Reviewers should keep the APK hash, signing-certificate notes, package name, and Android developer verification status with the listing packet.',
  },
] as const;

const releaseProofRows = [
  {
    label: 'Package ownership',
    value:
      'Confirm the package name, release owner, and official download URL before citing any third-party APK page.',
  },
  {
    label: 'Signing evidence',
    value:
      'Attach the SHA-256 hash and signing-certificate fingerprint when the release packet exposes them.',
  },
  {
    label: 'Verification status',
    value:
      'State whether Android developer verification is complete, pending, or not applicable instead of leaving reviewers to infer it.',
  },
  {
    label: 'Test scope',
    value:
      'Use public-domain, official-sample, or owner-approved pages only when testing OCR and translation output.',
  },
] as const;

const appTestRows = [
  {
    label: 'Install confidence',
    value:
      'Record Android version, device model, browser or file manager used, install prompt behavior, and whether the SHA-256 hash matched.',
  },
  {
    label: 'Activation path',
    value:
      'Test free trial or redeem-code activation, token-balance visibility, device binding, and the support path for recovery questions.',
  },
  {
    label: 'OCR workflow',
    value:
      'Use only public-domain, official-sample, or owner-approved pages and note OCR progress, block order, missing text, and translation latency.',
  },
  {
    label: 'Review boundary',
    value:
      'Keep screenshots free of copyrighted chapter pages unless the sample owner approved publication, and state that Nayovi does not host chapters.',
  },
] as const;

const evidenceRows = [
  {
    label: 'Screenshot rights',
    value:
      'Publish only install, activation, support, or approved-sample workflow screenshots; do not show copyrighted chapter pages unless the owner approved public use.',
  },
  {
    label: 'Device matrix',
    value:
      'Record at least one phone model, Android version, install source, network condition, and whether the reviewer tested free trial or redeem-code access.',
  },
  {
    label: 'OCR proof',
    value:
      'Keep before/after notes for detected text, missed regions, merged bubbles, reading order, correction notes, and final translation status.',
  },
  {
    label: 'Source packet',
    value:
      'Attach the official download URL, APK hash, support URL, pricing URL, responsible-use guide, and sample permission note with every review or directory listing.',
  },
] as const;

const reviewerHandoffRows = [
  {
    title: 'Directory listing',
    description:
      'Use the official download URL, current hash, pricing link, support link, and responsible-use guide. Do not republish the APK as an unsupported mirror-first download.',
  },
  {
    title: 'Editorial review',
    description:
      'Request a redeem code, approved-sample screenshots, device notes, and package/signing metadata before publishing a hands-on app review.',
  },
  {
    title: 'Partner pilot',
    description:
      'Keep the pilot limited to creator-approved, official-sample, public-domain, or owner-provided pages and confirm whether any result can be cited publicly.',
  },
] as const;

const directoryQualityRows = [
  {
    title: 'Preserve the source of truth',
    description:
      'A directory profile should link to the official download page, pricing, support, privacy, terms, and OCR checklist instead of hiding users behind a mirror page.',
  },
  {
    title: 'Avoid reciprocal-link gates',
    description:
      'Skip listings that require dofollow backlinks, paid placement, review swaps, or homepage badges as the condition for indexing Nayovi.',
  },
  {
    title: 'Represent pricing accurately',
    description:
      'Use free trial, redeem-code access, and paid token plans language; do not label Nayovi as a forever-free open-source app unless that becomes true.',
  },
] as const;

const updateSourceRows = [
  {
    label: 'Source URL',
    value:
      'Use the official download page as the human-readable source, then use the current APK button endpoint only as the file URL.',
  },
  {
    label: 'Update check',
    value:
      'Compare the published build label, file name, size, and SHA-256 hash before accepting an update from any tracker or directory.',
  },
  {
    label: 'Mirror boundary',
    value:
      'Do not treat third-party APK pages as the canonical source; they should point readers back to tachiyomiat.com for support, pricing, and policy links.',
  },
  {
    label: 'Power-user note',
    value:
      'If using an APK source tracker, keep this page attached as the source-of-truth note so future reviews can verify the same release metadata.',
  },
] as const;

const ownerConfirmationRows = [
  {
    label: 'Confirmed now',
    value:
      'Official domains, download URL, current APK file metadata, pricing, support, privacy, terms, and responsible-use links.',
  },
  {
    label: 'Owner must confirm',
    value:
      'Package name, signing-certificate fingerprint, Android developer verification status, official screenshots, and any public tester report rights.',
  },
  {
    label: 'Do not infer',
    value:
      'Do not copy package or verification claims from mirrors, screenshots, third-party APK pages, or community comments.',
  },
  {
    label: '2026 rollout',
    value:
      'For Android developer verification coverage, cite pending package, signing, and registration fields as owner-confirmation required until the official owner supplies exact public facts.',
  },
] as const;

const androidVerificationRows = [
  {
    label: 'Reviewer wording',
    value:
      'Nayovi is an official direct APK workflow; package name, signing fingerprint, developer verification status, and package registration state are pending owner confirmation.',
  },
  {
    label: 'Owner evidence',
    value:
      'The owner must confirm package identity, signing-certificate fingerprint, Android Developer Console or Play Console registration state, and any public verification language.',
  },
  {
    label: 'Allowed citation',
    value:
      'Cite the official download page, current APK metadata, support, pricing, privacy, terms, and responsible-use guide while those release identity fields remain pending.',
  },
  {
    label: 'Blocked citation',
    value:
      'Do not state or imply Google Play approval, Android developer verification, store availability, or third-party endorsement before those facts are confirmed.',
  },
] as const;

const citationReadinessRows = [
  {
    label: 'Media or podcast note',
    value:
      'Lead with the OCR QA checklist, approved-sample boundary, and human-review notes before mentioning install links or review codes.',
  },
  {
    label: 'Directory note',
    value:
      'Confirm the listing can show trial plus paid-token pricing, source-of-truth links, support, privacy, terms, and no-chapter-hosting language.',
  },
  {
    label: 'Localization partner note',
    value:
      'Use a no-link resource note first and ask whether approved-sample OCR observations are useful; do not imply catalog access or replacement of professional localization.',
  },
  {
    label: 'Android policy note',
    value:
      'Keep package name, signing fingerprint, and developer verification status marked owner-confirmation required until the exact public facts are confirmed.',
  },
] as const;

export const PageDownload = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Download"
        title="Download the TachiyomiAT-style Nayovi APK"
        description="Install the Android APK from tachiyomiat.com for readers coming from TachiyomiAT, Tachiyomi AT, Tachiyomi, or Mihon workflows, then activate hosted mode with a redeem code and start translating manga or manhwa chapters from the app."
        className="pt-7 md:pt-10"
        titleAs="h1"
      >
        <Card className="public-brand-panel mb-4 overflow-hidden rounded-[1.5rem] text-neutral-50 md:rounded-[1.75rem]">
          <CardContent className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 md:size-12">
                <DownloadIcon className="size-5 md:size-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  Latest TachiyomiAT-style Android APK
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-neutral-300 md:leading-7">
                  Universal APK for Android devices. Download it directly from
                  the official Nayovi backend if you searched for
                  TachiyomiAT APK, Tachiyomi AT download, Tachiyomi download,
                  or Mihon translation setup.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href={androidApkDownload.href}
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'w-full justify-center sm:w-auto'
                )}
              >
                <span className="flex items-center gap-2">
                  {androidApkDownload.label}
                  <DownloadIcon className="size-4" />
                </span>
              </a>
              <a
                href="#install"
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'lg' }),
                  'w-full justify-center sm:w-auto'
                )}
              >
                Installation help
              </a>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-neutral-300 lg:col-start-1">
              <span className="rounded-full border border-white/10 px-3 py-1">
                {androidApkDownload.buildLabel}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                {androidApkDownload.sizeLabel}
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                SHA-256 verified
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="public-brand-panel-muted rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <KeyRoundIcon className="size-5" />
              </div>
              <CardTitle className="text-xl">What hosted mode adds</CardTitle>
              <CardDescription>
                Hosted mode moves payment, token credits, redeem codes, device
                binding, and server-side provider
                routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-3">
                Pay for token packs on the public website.
              </div>
              <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-3">
                Redeem against an app installation instead of a user account.
              </div>
              <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-3">
                Run OCR and translation through the backend without shipping
                provider keys to the device.
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <CardTitle className="text-xl">Video demo</CardTitle>
              <CardDescription>
                Watch the current Android app flow before installing the APK.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DemoVideo className="py-5" />
            </CardContent>
          </Card>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Trust"
        title="Use the official APK path"
        description="Readers, reviewers, and affiliates should evaluate Nayovi from the same official download, activation, pricing, and support flow."
        className="pt-0"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {trustSignals.map((signal) => {
            const Icon = signal.icon;

            return (
              <Card key={signal.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{signal.title}</CardTitle>
                  <CardDescription>{signal.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        id="install"
        eyebrow="Install"
        title="Install in three steps"
        description="Android may ask you to allow installation from your browser or file manager before opening the APK."
        className="pb-20"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: DownloadIcon,
              title: 'Download the APK',
              description:
                'Use any APK button on this page to download the latest Nayovi Android build for TachiyomiAT, Tachiyomi, and Mihon-style readers.',
            },
            {
              icon: ShieldCheckIcon,
              title: 'Allow installation',
              description:
                'If Android asks, allow installs from your browser or file manager.',
            },
            {
              icon: BadgeCheckIcon,
              title: 'Activate hosted mode',
              description:
                'Open the app, enter your redeem code, and start translating chapters.',
            },
          ].map((step) => {
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

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div className="space-y-1">
              <p className="font-medium">Ready to install?</p>
              <p className="text-sm text-brand-950 dark:text-brand-100">
                This APK link always points to the latest uploaded Nayovi build
                for TachiyomiAT-style Android readers.
              </p>
            </div>
            <a
              href={androidApkDownload.href}
              className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
            >
              <span className="flex items-center gap-2">
                Download APK
                <DownloadIcon className="size-4" />
              </span>
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Verification"
        title="Reviewer and directory checklist"
        description="Use this packet when evaluating Nayovi for Android app coverage, app-directory listing, affiliate review, or creator-platform feedback."
        className="pt-0"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {verificationRows.map((row) => (
            <Card key={row.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                  <ClipboardCheckIcon className="size-5" />
                </div>
                <CardTitle className="text-lg">{row.title}</CardTitle>
                <CardDescription>{row.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="mt-4 rounded-[1.5rem]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div className="space-y-1">
              <p className="font-medium">Need review-code context?</p>
              <p className="text-sm text-muted-foreground">
                Send editors to the support path for a test code and cite the
                translation workflow guide for the no-chapter-hosting policy.
              </p>
            </div>
            <a
              href="/guides/translation-support-workflow"
              className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
            >
              Review workflow guide
            </a>
            <a
              href="/guides/comic-ocr-translation-checklist"
              className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }))}
            >
              Comic OCR checklist
            </a>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Trust"
        title="Independent APK distribution checks"
        description="Android app reviewers, directory editors, and readers can use these checks before treating any Nayovi APK link as authoritative, especially as Android developer verification changes how independent APKs are evaluated."
        className="pt-0"
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {trustRows.map((row) => (
            <Card key={row.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                  <FingerprintIcon className="size-5" />
                </div>
                <CardTitle className="text-lg">{row.title}</CardTitle>
                <CardDescription>{row.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              Nayovi is distributed as an official Android APK with hosted OCR
              and AI translation services. It should not be presented as an
              unaffiliated mirror, modded reader, chapter source, or replacement
              for publisher permission.
            </p>
            <p>
              If a reviewer or app directory is preparing coverage for the 2026
              Android developer verification rollout, cite this page as the
              source for current APK metadata and note any missing package-name,
              signing-certificate, or verification details as pending rather
              than guessing.
            </p>
            <p>
              If a directory, forum, or review page cannot preserve these
              source-of-truth details, use the official download page instead of
              creating a separate listing.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="APK metadata"
        title="Source-of-truth app details"
        description="Directory editors and Android reviewers can use these details to verify that a listing points back to the official Nayovi APK instead of an unsupported mirror."
        className="pt-0"
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {appMetadataRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[8rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span className="break-all">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              A correct listing should name Nayovi as an Android APK with
              hosted OCR and AI translation support, then send install, pricing,
              support, privacy, terms, and responsible-use questions back to
              tachiyomiat.com or nayovi.com.
            </p>
            <p>
              Avoid listings that present the APK as an unaffiliated mirror or
              imply that Nayovi hosts manga, manhwa, or manhua chapters.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Directories"
        title="When a listing is acceptable"
        description="Use this filter before submitting Nayovi to AI-tool, APK, startup, or app-review directories."
        className="pt-0"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {directoryQualityRows.map((row) => (
            <Card key={row.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                  <ClipboardCheckIcon className="size-5" />
                </div>
                <CardTitle className="text-lg">{row.title}</CardTitle>
                <CardDescription>{row.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Release proof"
        title="What reviewers should ask for before publishing"
        description="Use this release packet when a directory, newsletter, app reviewer, or partner needs evidence beyond a download button."
        className="pt-0"
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {releaseProofRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[10rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              If a listing cannot show package ownership, signing evidence,
              source links, support, pricing, and the no-chapter-hosting
              boundary together, treat it as a discovery mention and send
              installation traffic back to the official Nayovi download page.
            </p>
            <p>
              Reviewers can request a redeem code and sample-safe test context
              through support before publishing a hands-on Android OCR
              translation review.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Owner confirmation"
        title="Which APK trust fields are confirmed"
        description="Use this before publishing a directory listing, app review, newsletter item, or partner packet so pending verification details are not guessed."
        className="pt-0"
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {ownerConfirmationRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[10rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              A repo-native trust profile is available for reviewers who need a
              neutral packet instead of a product page:
              docs/seo-distribution/android-apk-trust-profile.md.
            </p>
            <p>
              Keep any missing package, signing, or verification fields marked
              as owner-confirmation required until Nayovi confirms the exact
              values.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Android 2026"
        title="Developer verification readiness"
        description="Use this language for reviewers, directories, and Android newsletters that ask how Nayovi handles the 2026 Android developer verification rollout."
        className="pt-0"
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {androidVerificationRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[11rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              The correct public stance is pending-language readiness: Nayovi
              can provide official source links and current APK metadata now,
              while package registration, signing fingerprint, and Android
              developer verification fields must wait for owner-confirmed
              release identity facts.
            </p>
            <p>
              This protects reviewers from copying unsupported mirror claims
              and gives directory editors a clear reason to preserve the
              official download page as the source of truth.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Citation readiness"
        title="Before a third party mentions Nayovi"
        description="Use this packet before sending Nayovi to manga media, Android newsletters, AI directories, app reviewers, localization teams, or creator-platform contacts."
        className="pt-0"
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
                <span>{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              A useful third-party mention should help readers verify the
              official APK source, understand the hosted OCR workflow, and know
              which samples are safe to process before it sends anyone to a
              download button.
            </p>
            <p>
              If the platform is mainly a podcast, newsletter, creator
              community, or localization studio, use the comic OCR checklist or
              approved-sample pilot guide as the first reference and keep the
              product link optional.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Testing"
        title="Safe Android app test packet"
        description="Use this packet when a reviewer, beta-testing service, directory editor, or partner needs a repeatable test plan before recommending the APK."
        className="pt-0"
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {appTestRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[10rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              Do not upload the APK to an external testing platform or send a
              redeem code until the owner approves the exact tester scope,
              sample pages, and publication rights for screenshots or videos.
            </p>
            <p>
              A useful test report should cover install trust, activation,
              hosted OCR progress, translation review, support clarity, and the
              no-chapter-hosting boundary rather than only confirming that the
              APK opens.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Evidence"
        title="Screenshot and reviewer proof packet"
        description="Use this when an Android reviewer, app-testing service, directory editor, newsletter, or partner asks for proof they can cite publicly."
        className="pt-0"
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {evidenceRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[10rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              A strong Nayovi review packet should make the install path,
              activation path, OCR behavior, sample permission, and support
              route visible without depending on unsupported APK mirrors or
              unauthorized manga, manhwa, or manhua pages.
            </p>
            <p>
              If a reviewer wants a public screenshot set, use neutral Android
              workflow screens or owner-approved sample pages first, then keep
              any chapter-specific evidence private unless publication rights
              are explicit.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Handoff"
        title="How third parties should cite Nayovi"
        description="Use this handoff before adding Nayovi to an app directory, writing a review, preparing a newsletter mention, or asking for a creator-platform pilot."
        className="pt-0"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {reviewerHandoffRows.map((row) => (
            <Card key={row.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                  <ClipboardCheckIcon className="size-5" />
                </div>
                <CardTitle className="text-lg">{row.title}</CardTitle>
                <CardDescription>{row.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              The safest public citation is the official download page plus the
              comic OCR checklist. That gives readers the install source,
              metadata, support route, pricing context, and sample-permission
              boundary in one place.
            </p>
            <p>
              If a third-party listing cannot show those details clearly, cite
              Nayovi as an Android hosted OCR workflow and send install traffic
              back here instead of publishing a separate APK copy.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Updates"
        title="APK source setup note"
        description="Use this note when an Android power user, APK tracker, directory editor, or reviewer wants to follow the official Nayovi APK source without relying on unsupported mirrors."
        className="pt-0"
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {updateSourceRows.map((row) => (
              <div
                key={row.label}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[10rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.label}
                </span>
                <span>{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-6 text-sm leading-7 text-brand-950 dark:text-brand-100">
            <p>
              A correct source setup should store the official Nayovi download
              page, the current APK endpoint, the SHA-256 hash, and the support
              URL together. That keeps update-minded Android users on the same
              source-of-truth path as reviewers and directories.
            </p>
            <p>
              Nayovi does not currently claim inclusion in any third-party APK
              repository or automatic update catalog. Treat external tracker
              setup as a personal convenience until a listing is reviewed and
              approved through an official path.
            </p>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="More help"
        title="Need setup or support?"
        description="Use these links if you want to understand the hosted flow before installing."
        className="pt-0"
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="flex flex-wrap gap-3 p-6">
            <a
              href="/how-it-works"
              className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
            >
              <span className="flex items-center gap-2">
                Hosted flow preview
                <ArrowRightIcon className="size-4" />
              </span>
            </a>
            <a
              href="/support"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              Contact support
            </a>
            <a
              href="/guides/mihon-tachiyomiat-setup"
              className={buttonVariants({ variant: 'ghost', size: 'lg' })}
            >
              TachiyomiAT setup guide
            </a>
            <a
              href="/"
              className={buttonVariants({ variant: 'ghost', size: 'lg' })}
            >
              <span className="flex items-center gap-2">
                Back to overview
                <DownloadIcon className="size-4" />
              </span>
            </a>
          </CardContent>
        </Card>
      </PublicSection>
    </PublicShell>
  );
};
