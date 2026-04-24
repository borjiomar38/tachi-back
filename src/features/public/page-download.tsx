import {
  ArrowRightIcon,
  BadgeCheckIcon,
  DownloadIcon,
  FileArchiveIcon,
  KeyRoundIcon,
  PlayCircleIcon,
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

import { androidApkDownload, youtubeDemo } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

export const PageDownload = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Download"
        title="Download TachiyomiAT for Android"
        description="Install the Android APK, activate hosted mode with a redeem code, and start translating manga or manhwa chapters from the app."
        className="pt-10"
      >
        <Card className="mb-4 overflow-hidden rounded-[1.75rem] border-neutral-900 bg-neutral-950 text-neutral-50">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-4">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
                <DownloadIcon className="size-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">
                  Latest Android APK
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-neutral-300">
                  Universal APK for Android devices. Download it directly from
                  the official TachiyomiAT backend.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-neutral-300">
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
            </div>
            <div className="flex flex-col gap-3">
              <a
                href={androidApkDownload.href}
                className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
              >
                <span className="flex items-center gap-2">
                  {androidApkDownload.label}
                  <DownloadIcon className="size-4" />
                </span>
              </a>
              <a
                href="#install"
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                Installation help
              </a>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                <SmartphoneIcon className="size-5" />
              </div>
              <CardTitle className="text-xl">Direct APK download</CardTitle>
              <CardDescription>
                Use the main APK button if you are on Android, or share this
                page with your phone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <a
                href={androidApkDownload.href}
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                <span className="flex items-center gap-2">
                  Download APK
                  <FileArchiveIcon className="size-4" />
                </span>
              </a>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-neutral-900 bg-neutral-950 text-neutral-50">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-neutral-50">
                <KeyRoundIcon className="size-5" />
              </div>
              <CardTitle className="text-xl">What hosted mode adds</CardTitle>
              <CardDescription className="text-neutral-300">
                Hosted mode moves payment, token credits, redeem codes, device
                binding, and server-side provider
                routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-neutral-300">
              <div className="rounded-xl border border-white/10 px-3 py-3">
                Pay for token packs on the public website.
              </div>
              <div className="rounded-xl border border-white/10 px-3 py-3">
                Redeem against an app installation instead of a user account.
              </div>
              <div className="rounded-xl border border-white/10 px-3 py-3">
                Run OCR and translation through the backend without shipping
                provider keys to the device.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                <PlayCircleIcon className="size-5" />
              </div>
              <CardTitle className="text-xl">Video demo</CardTitle>
              <CardDescription>
                The demo should be watched online from YouTube, not downloaded
                as a file.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {youtubeDemo.watchUrl ? (
                <a
                  href={youtubeDemo.watchUrl}
                  className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                  Watch on YouTube
                </a>
              ) : (
                <div className="rounded-xl border border-dashed border-border/80 px-4 py-3 text-sm text-muted-foreground">
                  YouTube demo link will be added here after upload.
                </div>
              )}
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
                'Use any APK button on this page to download the latest Android build.',
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

        <Card className="mt-4 rounded-[1.5rem] border-warning-200 bg-warning-50/80 dark:border-warning-900/60 dark:bg-warning-950/15">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div className="space-y-1">
              <p className="font-medium">Ready to install?</p>
              <p className="text-sm text-warning-900 dark:text-warning-100">
                This APK link always points to the latest uploaded Android build.
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
