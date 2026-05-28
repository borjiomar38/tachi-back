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
  {
    title: 'Separate file hash from certificate identity',
    description:
      'Record both the downloaded file SHA-256 and the signing-certificate SHA-256 fingerprint so readers can verify the exact file and the developer identity used for updates.',
  },
] as const;

const reviewerVerificationRows = [
  {
    label: 'File integrity',
    detail:
      'Compare the downloaded APK file SHA-256 against the value on this page before publishing screenshots, mirrors, or installation instructions.',
  },
  {
    label: 'Signing certificate',
    detail:
      'Use Android signing tools or Play Console certificate details to record the app signing certificate SHA-256 fingerprint when it is available from the release owner.',
  },
  {
    label: 'Package identity',
    detail:
      'Keep the package name, build label, filename, APK size, and signing-certificate note together so future updates can be matched to the same official app.',
  },
  {
    label: 'Pending fields',
    detail:
      'If package name, certificate fingerprint, Play Console developer verification, or store metadata is not confirmed yet, mark it pending instead of guessing.',
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

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {reviewerVerificationRows.map((row) => (
            <Card key={row.label} className="rounded-[1.5rem]">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                  <FingerprintIcon className="size-5" />
                </div>
                <CardTitle className="text-lg">{row.label}</CardTitle>
                <CardDescription>{row.detail}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

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
