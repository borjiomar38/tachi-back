import {
  ArrowRightIcon,
  DownloadIcon,
  KeyRoundIcon,
  PlayCircleIcon,
  ServerIcon,
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

import { activationSteps } from '@/features/public/data';
import { androidApkDownload, youtubeDemo } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

const flowNotes = [
  {
    icon: KeyRoundIcon,
    title: 'Redeem code instead of account login',
    description:
      'The hosted flow is designed for installation identity and support recovery, not end-user web sessions.',
  },
  {
    icon: SmartphoneIcon,
    title: 'Device binding is explicit',
    description:
      'Backoffice staff can inspect and recover device bindings when a customer changes phones or reinstalls.',
  },
  {
    icon: ServerIcon,
    title: 'Provider calls stay on the backend',
    description:
      'OCR and translation providers are consumed from the server so the Android client does not expose API secrets.',
  },
] as const;

export const PageHowItWorks = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="How it works"
        title="Hosted activation without customer accounts"
        description="The public website explains the current redeem-code flow clearly because TachiyomiAT does not use a traditional customer account system for hosted access."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {flowNotes.map((item) => {
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
        eyebrow="Demo"
        title="Watch the TachiyomiAT translation flow"
        description="The final tutorial video should live on YouTube and play online from this page. The APK remains a direct Android download."
      >
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <Card className="overflow-hidden rounded-[1.75rem] border-neutral-900 bg-neutral-950 text-neutral-50">
            <CardContent className="p-0">
              {youtubeDemo.embedUrl ? (
                <div className="aspect-video w-full">
                  <iframe
                    src={youtubeDemo.embedUrl}
                    title="TachiyomiAT translation demo"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-black">
                  <div className="max-w-sm space-y-3 px-6 text-center">
                    <PlayCircleIcon className="mx-auto size-12 text-warning-300" />
                    <p className="text-lg font-semibold">YouTube demo coming soon</p>
                    <p className="text-sm leading-6 text-neutral-300">
                      Add the YouTube embed link once the final video is online.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader className="gap-3">
              <CardTitle className="text-2xl">Install while watching</CardTitle>
              <CardDescription>
                Keep the video online, and make the APK easy to find from the
                same screen.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-7 text-muted-foreground">
              <div className="rounded-xl border border-border/70 px-4 py-3">
                Watch the YouTube demo to understand the translation flow before
                installing.
              </div>
              <div className="rounded-xl border border-border/70 px-4 py-3">
                Download the APK directly from the website when you are ready to
                test on Android.
              </div>
              <div className="rounded-xl border border-border/70 px-4 py-3">
                Activate hosted mode with a redeem code after installation.
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
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Step by step"
        title="Activation sequence"
        description="This page explains the current hosted flow from checkout to device-bound access."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {activationSteps.map((step) => (
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
        eyebrow="Important boundary"
        title="What still needs polish"
        description="The core hosted flow is live, but rollout polish and support tooling still continue."
        className="pb-20"
      >
        <Card className="rounded-[1.5rem] border-warning-200 bg-warning-50/80 dark:border-warning-900/60 dark:bg-warning-950/15">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">Current follow-up work</CardTitle>
            <CardDescription className="text-warning-900 dark:text-warning-100">
              Lemon Squeezy checkout, webhook fulfillment, redeem-code
              activation, device-bound mobile sessions, and Android hosted mode
              are in place. Remaining work is around recovery UX, review mode,
              refund tooling, and launch hardening.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a
              href="/pricing"
              className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
            >
              <span className="flex items-center gap-2">
                Review pricing
                <ArrowRightIcon className="size-4" />
              </span>
            </a>
            <a
              href="/download"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              Download guidance
            </a>
          </CardContent>
        </Card>
      </PublicSection>
    </PublicShell>
  );
};
