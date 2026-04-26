import {
  ArrowRightIcon,
  BadgeCheckIcon,
  DownloadIcon,
  KeyRoundIcon,
  PlayCircleIcon,
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

import { androidApkDownload, youtubeDemo } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

export const PageDownload = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Download"
        title="Download TachiyomiAT for Android"
        description="Install the Android APK, activate hosted mode with a redeem code, and start translating manga or manhwa chapters from the app."
        className="pt-7 md:pt-10"
      >
        <Card className="public-brand-panel mb-4 overflow-hidden rounded-[1.5rem] text-neutral-50 md:rounded-[1.75rem]">
          <CardContent className="grid gap-4 p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-white/10 md:size-12">
                <DownloadIcon className="size-5 md:size-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                  Latest Android APK
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-neutral-300 md:leading-7">
                  Universal APK for Android devices. Download it directly from
                  the official TachiyomiAT backend.
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

          {youtubeDemo.watchUrl ? (
            <Card className="rounded-[1.5rem]">
              <CardHeader className="gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <PlayCircleIcon className="size-5" />
                </div>
                <CardTitle className="text-xl">Video demo</CardTitle>
                <CardDescription>
                  Watch the app flow online from YouTube.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={youtubeDemo.watchUrl}
                  className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                  Watch on YouTube
                </a>
              </CardContent>
            </Card>
          ) : null}
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

        <Card className="public-brand-panel-muted mt-4 rounded-[1.5rem]">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div className="space-y-1">
              <p className="font-medium">Ready to install?</p>
              <p className="text-sm text-brand-950 dark:text-brand-100">
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
