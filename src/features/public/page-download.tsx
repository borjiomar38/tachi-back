import {
  ArrowRightIcon,
  BadgeCheckIcon,
  DownloadIcon,
  FileKeyIcon,
  HelpCircleIcon,
  LockKeyholeIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  WalletCardsIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import {
  type AndroidApkDownload,
  androidApkDownload as defaultAndroidApkDownload,
} from '@/features/public/download-assets';
import { PublicShell } from '@/features/public/public-shell';

interface PageDownloadProps {
  androidApkDownload?: AndroidApkDownload;
}

const installSteps = [
  {
    title: '1. Download the APK',
    description: 'Tap the official download button on this page.',
    icon: DownloadIcon,
  },
  {
    title: '2. Allow installation',
    description: 'Android may ask you to allow installs from your browser.',
    icon: ShieldCheckIcon,
  },
  {
    title: '3. Open Nayovi',
    description: 'Launch the app, open a chapter, and choose your language.',
    icon: PlayCircleIcon,
  },
] as const;

const downloadSignals = [
  { label: 'Official APK', icon: BadgeCheckIcon },
  { label: 'Android', icon: SmartphoneIcon },
  { label: 'SHA-256 available', icon: ShieldCheckIcon },
] as const;

const helpCards = [
  {
    title: 'Android blocked the install',
    description: 'Allow the APK from your browser or file manager.',
    href: '/guides/best-android-manga-translator-apk',
    icon: LockKeyholeIcon,
  },
  {
    title: 'Need setup help',
    description: 'Follow the step-by-step guide to get started.',
    href: '/guides/mihon-nayovi-setup',
    icon: HelpCircleIcon,
  },
  {
    title: 'Payment or activation help',
    description: 'Contact Nayovi about a delayed plan or email.',
    href: '/support',
    icon: WalletCardsIcon,
  },
] as const;

export const PageDownload = ({
  androidApkDownload = defaultAndroidApkDownload,
}: PageDownloadProps) => {
  const trustSignals = [
    ...downloadSignals,
    { label: androidApkDownload.sizeLabel, icon: FileKeyIcon },
  ];

  return (
    <PublicShell compactFooter>
      <section className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-8 md:py-9">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12">
          <div className="max-w-3xl">
            <Badge variant="brand" size="sm">
              Official Android app
            </Badge>
            <h1 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-5xl">
              Download Nayovi for manhwa and manga translation on Android.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Install the official APK, open a chapter, and try the translator
              free.
            </p>

            <a
              href={androidApkDownload.href}
              className={cn(
                buttonVariants({ variant: 'default', size: 'lg' }),
                'mt-6 min-h-12 w-full justify-center px-7 sm:w-fit',
              )}
            >
              <span className="flex items-center gap-2">
                Download Nayovi APK
                <DownloadIcon className="size-4" />
              </span>
            </a>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Downloaded directly from tachiyomiat.com. Verify the published
              file details below.
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs sm:text-sm">
              {trustSignals.map((signal) => {
                const Icon = signal.icon;

                return (
                  <span
                    key={signal.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-2 text-muted-foreground backdrop-blur"
                  >
                    <Icon className="size-4 text-brand-200" />
                    {signal.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[12.5rem] lg:max-w-[13rem]">
            <div className="absolute inset-8 -z-10 rounded-full bg-brand-500/20 blur-3xl" />
            <img
              src="/marketing/nayovi-history-phone.png"
              alt="Nayovi Android reader history with recently read manhwa and manga chapters"
              width="864"
              height="1821"
              className="h-auto w-full object-contain drop-shadow-[0_28px_48px_rgba(0,0,0,0.55)]"
            />
          </div>
        </div>

        <div
          id="install"
          className="mt-8 grid scroll-mt-24 gap-3 lg:grid-cols-3"
        >
          {installSteps.map((step) => {
            const Icon = step.icon;

            return (
              <Card
                key={step.title}
                className="rounded-2xl border-border/80 bg-card/75 py-0 backdrop-blur"
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-300/15 text-brand-200 ring-1 ring-brand-300/20">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="font-semibold">{step.title}</h2>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="public-brand-panel-muted mt-3 rounded-2xl py-0">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between md:px-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Start with the free trial</h2>
              <p className="text-sm text-brand-950/75 dark:text-brand-100/80">
                Try about two average chapters. No card required.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={androidApkDownload.href}
                className={buttonVariants({ variant: 'default' })}
              >
                Try Nayovi
              </a>
              <a
                href="/pricing"
                className={buttonVariants({ variant: 'secondary' })}
              >
                See plans
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-3 rounded-2xl border-border/80 bg-card/75 py-0 backdrop-blur">
          <CardContent className="p-4 md:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Verify your download</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Confirm that the APK matches the file published by Nayovi.
                </p>
              </div>
              <Badge variant="secondary" size="sm" className="mt-2 sm:mt-0">
                SHA-256 published
              </Badge>
            </div>

            <dl className="mt-4 grid gap-4 border-t border-border/70 pt-4 md:grid-cols-[0.8fr_1fr_2fr]">
              <div className="min-w-0">
                <dt className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  File name
                </dt>
                <dd className="mt-1 truncate text-sm font-medium">
                  {androidApkDownload.filename}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Build and size
                </dt>
                <dd className="mt-1 text-sm font-medium">
                  {androidApkDownload.buildLabel} ·{' '}
                  {androidApkDownload.sizeLabel}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  SHA-256
                </dt>
                <dd className="mt-1">
                  <code className="block overflow-x-auto rounded-lg border border-border/70 bg-muted/50 px-3 py-2 text-xs">
                    {androidApkDownload.sha256}
                  </code>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {helpCards.map((item) => {
            const Icon = item.icon;

            return (
              <a key={item.title} href={item.href} className="group block">
                <Card className="h-full rounded-2xl border-border/80 bg-card/60 py-0 transition group-hover:border-brand-300/40 group-hover:bg-card/85">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-300/10 text-brand-200">
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-semibold">{item.title}</h2>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </CardContent>
                </Card>
              </a>
            );
          })}
        </div>
      </section>
    </PublicShell>
  );
};
