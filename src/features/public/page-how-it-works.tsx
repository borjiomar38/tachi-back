import { ArrowRightIcon, KeyRoundIcon, ServerIcon, SmartphoneIcon } from 'lucide-react';

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
      'Backoffice staff will be able to inspect and recover device bindings when a customer changes phones or reinstalls.',
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
        description="The public website needs to explain the eventual redeem-code flow clearly now, because TachiyomiAT does not have a normal login model for this product."
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
        title="Watch the baseline Tachiyomi flow"
        description="This embedded demo uses the video “How to Use Tachiyomi App” by How-To-Heroes to show the core Tachiyomi experience first. It helps customers understand the existing app flow before hosted OCR, translation, redeem codes, and token-backed jobs are layered on top."
      >
        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <Card className="overflow-hidden rounded-[1.75rem] border-neutral-900 bg-neutral-950 text-neutral-50">
            <CardContent className="p-0">
              <div className="aspect-video w-full">
                <iframe
                  src="https://www.youtube.com/embed/0aZU4nbLKrw"
                  title="How to Use Tachiyomi App"
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.75rem]">
            <CardHeader className="gap-3">
              <CardTitle className="text-2xl">Why this demo is here</CardTitle>
              <CardDescription>
                The video is not about the hosted backend itself. It is here to
                explain the existing Tachiyomi usage pattern that your hosted
                OCR and translation flow is designed to extend.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm leading-7 text-muted-foreground">
              <div className="rounded-xl border border-border/70 px-4 py-3">
                It shows a general Tachiyomi app walkthrough, which gives users
                the baseline reading and library context first.
              </div>
              <div className="rounded-xl border border-border/70 px-4 py-3">
                Your hosted product then plugs into that same mobile workflow
                instead of replacing it with a separate reader or web account.
              </div>
              <div className="rounded-xl border border-border/70 px-4 py-3">
                The backend-specific pieces come after that baseline: buy
                tokens, receive a redeem code, bind an installation, submit
                pages, and get translated chapter data back.
              </div>
              <a
                href="https://www.youtube.com/watch?v=0aZU4nbLKrw"
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }))}
              >
                Watch on YouTube
              </a>
            </CardContent>
          </Card>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Step by step"
        title="Activation sequence"
        description="This is the public-facing explanation of the planned hosted flow. Checkout, redemption, and mobile API calls still land in later phases."
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
        title="What is not live yet"
        description="Phase 5 is only the public explanation and pricing surface."
        className="pb-20"
      >
        <Card className="rounded-[1.5rem] border-warning-200 bg-warning-50/80 dark:border-warning-900/60 dark:bg-warning-950/15">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">Still pending after this phase</CardTitle>
            <CardDescription className="text-warning-900 dark:text-warning-100">
              Stripe Checkout, paid order fulfillment, redeem-code APIs,
              device-bound mobile sessions, and Android hosted-mode integration
              all stay in later phases even though the public website now
              explains the intended flow.
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
