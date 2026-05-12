import {
  ArrowRightIcon,
  BadgeCheckIcon,
  DownloadIcon,
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
      'Install the APK, activate with a redeem code, and translate from the reader workflow.',
    icon: KeyRoundIcon,
  },
] as const;

const workflowSteps = [
  {
    title: 'Download TachiyomiAT',
    description:
      'Install the Android APK from the official TachiyomiAT website.',
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

const faqs = [
  {
    title: 'Is TachiyomiAT a free manhwa AI translator?',
    description:
      'TachiyomiAT offers free trial access for testing manga, manhwa, and manhua AI translation, with monthly token plans for heavier use.',
  },
  {
    title: 'Does TachiyomiAT translate manga and manhua too?',
    description:
      'Yes. The same hosted OCR and AI translation workflow is designed for manga, manhwa, and manhua reading tasks.',
  },
  {
    title: 'Does TachiyomiAT host manhwa chapters?',
    description:
      'No. TachiyomiAT provides app setup, hosted OCR, translation support, activation, and support workflows. It does not publish or distribute chapters.',
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
                Translate manhwa with AI in TachiyomiAT.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                TachiyomiAT helps Android readers use hosted OCR and AI
                translation for manhwa, manga, and manhua pages while keeping
                the official app download, activation, and support flow in one
                place.
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
        eyebrow="Why TachiyomiAT"
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
                TachiyomiAT is a translator workflow, not a chapter host. Use it
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
        id="faq"
        eyebrow="FAQ"
        title="Manhwa AI translator questions"
        description="Quick answers for readers comparing TachiyomiAT with generic manga or manhwa translation tools."
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
              <p className="font-medium">Ready to try TachiyomiAT?</p>
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
