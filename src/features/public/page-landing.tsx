import {
  ArrowRightIcon,
  CoinsIcon,
  DownloadIcon,
  KeyRoundIcon,
  LanguagesIcon,
  MailIcon,
  MessageCircleIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import heroBackground from '@/features/auth/layout-login-background.webp';
import heroCharacter from '@/features/auth/layout-login-character.webp';
import {
  activationSteps,
  PUBLIC_OWNER_WHATSAPP_DISPLAY,
  PUBLIC_OWNER_WHATSAPP_HREF,
  publicHighlights,
  type PublicTokenPack,
  supportFaqs,
} from '@/features/public/data';
import { androidApkDownload, youtubeDemo } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';
import { TokenPackCard } from '@/features/public/token-pack-card';

const highlightIcons = [
  LanguagesIcon,
  KeyRoundIcon,
  CoinsIcon,
  ShieldCheckIcon,
] as const;

const contactCards = [
  {
    title: 'Billing and packs',
    description:
      'Questions about plans, payment, or which offer fits your reading style.',
    href: '/pricing',
    cta: 'View pricing',
    icon: CoinsIcon,
  },
  {
    title: 'Activation and devices',
    description:
      'Need help with your redeem code or moving access to another device.',
    href: '/support',
    cta: 'Open support',
    icon: KeyRoundIcon,
  },
  {
    title: 'Download and setup',
    description:
      'See where to download the app and how to start quickly.',
    href: '/download',
    cta: 'Read setup guide',
    icon: SmartphoneIcon,
  },
  {
    title: 'General contact',
    description:
      'Send a simple message if you need help before or after payment.',
    href: '/#contact',
    cta: 'Open contact form',
    icon: MailIcon,
  },
] as const;

export const PageLanding = (props: {
  contactStatus?: 'sent' | 'error' | 'invalid';
  tokenPacks: PublicTokenPack[];
}) => {
  const freeTokenPack = props.tokenPacks.find(
    (tokenPack) => tokenPack.key === 'free'
  );
  const paidTokenPacks = props.tokenPacks.filter(
    (tokenPack) => tokenPack.key !== 'free'
  );
  const featuredTokenPack =
    paidTokenPacks.find((tokenPack) => tokenPack.key === 'pro') ??
    paidTokenPacks[1] ??
    paidTokenPacks[0];
  const heroPlan = featuredTokenPack ?? props.tokenPacks[0];

  return (
    <PublicShell>
      <section
        id="hero"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-8 md:py-14"
      >
        <div className="relative isolate min-h-[34rem] overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950 px-5 py-7 text-neutral-50 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.75)] ring-1 ring-black/10 sm:px-7 md:min-h-[37rem] md:px-10 md:py-10">
          <img
            src={heroBackground}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral-950 via-neutral-950/82 to-neutral-950/25" />
          <div className="absolute inset-0 -z-10 bg-linear-to-t from-neutral-950 via-neutral-950/20 to-neutral-950/20" />
          <img
            src={heroCharacter}
            alt=""
            className="animate-float-in-space pointer-events-none absolute right-[-7rem] bottom-[-8rem] z-0 hidden w-[min(38rem,48%)] drop-shadow-[0_30px_56px_rgba(0,0,0,0.55)] md:block lg:right-[-4rem]"
          />

          <div className="relative z-10 flex min-h-[28rem] max-w-3xl flex-col justify-center gap-7 md:min-h-[31rem]">
            <Badge
              variant="brand"
              size="lg"
              className="border-white/15 bg-white/10 text-neutral-50 backdrop-blur"
            >
              Free manga, manhwa & manhua IA translator
            </Badge>

            <div className="space-y-5">
              <p className="text-sm font-semibold tracking-[0.22em] text-brand-100 uppercase">
                Simple AI translation inside TachiyomiAT
              </p>
              <h1 className="max-w-3xl text-4xl leading-[1.03] font-semibold tracking-normal text-balance md:text-6xl">
                Try a free manga IA translator.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                Use TachiyomiAT as a free manga IA translator, free manhwa IA
                translator, and free manhua IA translator with hosted OCR,
                clean translation, redeem-code activation, and one Android APK
                download.
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
                href="/#pricing"
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'lg' }),
                  'min-h-11 border-white/20 bg-white/10 text-neutral-50 hover:bg-white/15'
                )}
              >
                <span className="flex items-center gap-2">
                  See monthly plans
                  <ArrowRightIcon className="size-4" />
                </span>
              </a>
            </div>

            <div className="flex max-w-2xl flex-nowrap gap-2 overflow-x-auto pb-1 text-xs text-neutral-200 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:pb-0 sm:text-sm">
              <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 backdrop-blur sm:block sm:rounded-2xl sm:px-4 sm:py-3">
                <p className="font-semibold text-neutral-50">APK</p>
                <p className="text-neutral-300 sm:mt-1">
                  {androidApkDownload.sizeLabel}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 backdrop-blur sm:block sm:rounded-2xl sm:px-4 sm:py-3">
                <p className="font-semibold text-neutral-50">Redeem code</p>
                <p className="text-neutral-300 sm:mt-1">Email delivery</p>
              </div>
              <div className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 backdrop-blur sm:block sm:rounded-2xl sm:px-4 sm:py-3">
                <p className="font-semibold text-neutral-50">Hosted OCR</p>
                <p className="mt-1 text-neutral-300">Clean detection</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-5 grid gap-3 md:absolute md:right-8 md:bottom-8 md:mt-0 md:w-[23rem]">
            <div className="rounded-[1.35rem] border border-white/10 bg-neutral-950/72 p-4 shadow-2xl backdrop-blur">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-300 text-brand-950">
                  <KeyRoundIcon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Redeem code ready</p>
                  <p className="text-xs text-neutral-300">
                    Activate once in TachiyomiAT.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-neutral-950/72 p-4 shadow-2xl backdrop-blur">
              <div className="public-hero-scanline" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-brand-100 uppercase">
                    Translation
                  </p>
                  <p className="mt-1 text-lg font-semibold">OCR complete</p>
                </div>
                <span className="flex size-10 items-center justify-center rounded-2xl bg-positive-400/20 text-positive-200">
                  <ShieldCheckIcon className="size-5" />
                </span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div className="h-full w-[82%] rounded-full bg-brand-300" />
              </div>
              <p className="mt-3 text-xs leading-5 text-neutral-300">
                {heroPlan
                  ? `${heroPlan.name} plan, ${heroPlan.marketedChaptersPerMonth} chapters/month estimate.`
                  : 'Monthly plans and hosted text detection.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PublicSection
        id="demo"
        eyebrow="Demo"
        title="See how it feels in the app"
        description="The goal is simple: open a chapter, activate your plan once, translate, and keep reading your manga or manhwa."
      >
        <Card className="public-ink-panel mb-4 overflow-hidden rounded-[1.75rem] text-neutral-50">
          <CardHeader className="gap-2 border-b border-white/10">
            <CardTitle className="text-2xl">Video demo</CardTitle>
            <CardDescription className="text-neutral-300">
              The final product demo will be embedded from YouTube so visitors
              can watch it online without downloading a video file.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0 lg:grid-cols-[1.15fr_0.85fr]">
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
                  <PlayCircleIcon className="mx-auto size-12 text-brand-300" />
                  <p className="text-lg font-semibold">YouTube demo coming soon</p>
                  <p className="text-sm leading-6 text-neutral-300">
                    Upload the final tutorial to YouTube, then add the embed
                    link here.
                  </p>
                </div>
              </div>
            )}
            <div className="p-6">
              <p className="text-sm font-medium tracking-[0.2em] text-neutral-400 uppercase">
                Why it matters
              </p>
              <div className="mt-4 grid gap-3 text-sm text-neutral-200">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  Read manga, manhwa, and manhua in the same app you already use.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  Start with free IA translator access, then use AI translation
                  when pages need help.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  Keep the reading flow simple instead of learning a technical
                  setup.
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <a
                  href={androidApkDownload.href}
                  className={buttonVariants({ variant: 'default', size: 'lg' })}
                >
                  <span className="flex items-center gap-2">
                    Download APK
                    <DownloadIcon className="size-4" />
                  </span>
                </a>
                <a
                  href="/download"
                  className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                  Install guide
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="public-ink-panel overflow-hidden rounded-[1.75rem] text-neutral-50">
              <CardHeader className="gap-2 border-b border-white/10">
              <CardTitle className="text-2xl">Simple reading flow</CardTitle>
              <CardDescription className="text-neutral-300">
                Start from the app, let the service detect and translate the
                text, then continue reading manga, manhwa, or manhua normally.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6">
              <div className="grid gap-4 lg:grid-cols-[0.92fr_auto_1.08fr] lg:items-center">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium tracking-[0.2em] text-neutral-400 uppercase">
                    In the app
                  </p>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="rounded-xl bg-white/5 px-3 py-3">
                      Choose the chapter you want to read.
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-3">
                      Add your redeem code once.
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-3">
                      Launch the translation and keep reading.
                    </div>
                  </div>
                </div>
                <div className="hidden justify-center lg:flex">
                  <ArrowRightIcon className="size-7 text-brand-300" />
                </div>
                <div className="rounded-[1.25rem] border border-brand-300/15 bg-brand-400/10 p-4 text-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <p className="text-sm font-medium tracking-[0.2em] text-brand-100 uppercase">
                    In the service
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-neutral-100">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                      Detect text on manga, manhwa, and manhua pages.
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                      Translate the detected text.
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                      Send back pages ready to read in the app.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-brand-300/15 bg-brand-400/10 px-4 py-4">
                <p className="text-sm font-medium tracking-[0.2em] text-neutral-300 uppercase">
                  Simple result
                </p>
                <p className="mt-2 text-sm leading-7 text-neutral-200">
                  The goal is to keep free manga IA translator, free manhwa IA
                  translator, and free manhua IA translator workflows smooth
                  inside TachiyomiAT.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {activationSteps.map((step) => (
              <Card key={step.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-2">
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {publicHighlights.map((item, index) => {
            const Icon = highlightIcons[index] ?? ShieldCheckIcon;
            return (
              <Card
                key={item.title}
                className="rounded-[1.5rem] dark:border-white/10 dark:bg-white/[0.03]"
              >
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:border dark:border-brand-300/20 dark:bg-brand-300/12 dark:text-brand-100">
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
        id="pricing"
        eyebrow="Pricing"
        title="Simple monthly plans"
        description="Choose the offer that matches how much manga, manhwa, or manhua you want to translate every month."
      >
        {freeTokenPack ? (
          <div className="mb-4 grid gap-4 lg:grid-cols-3">
            <div className="hidden lg:block" aria-hidden="true" />
            <TokenPackCard
              tokenPack={freeTokenPack}
              featured={false}
            />
            <div className="hidden lg:block" aria-hidden="true" />
          </div>
        ) : null}
        <div className="grid gap-4 lg:grid-cols-3">
          {paidTokenPacks.map((tokenPack) => (
            <TokenPackCard
              key={tokenPack.id}
              tokenPack={tokenPack}
              featured={tokenPack.id === featuredTokenPack?.id}
            />
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Chapter estimates are simple approximations for normal monthly use.
        </p>
      </PublicSection>

      <PublicSection
        id="contact"
        eyebrow="Contact"
        title="Need help?"
        description="Use the form below if you have a question about plans, payment, activation, or app setup."
      >
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="public-ink-panel rounded-[1.75rem] text-neutral-50">
            <CardHeader className="gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" size="sm">
                  Contact form
                </Badge>
                <Badge variant="brand" size="sm">
                  Stored in support inbox
                </Badge>
              </div>
              <CardTitle className="text-2xl">Talk to Tachiyomi Back</CardTitle>
              <CardDescription className="text-neutral-300">
                Ask us about plans, redeem codes, payment, or getting
                started in the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="public-brand-panel-muted rounded-[1.35rem] p-4 md:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="flex size-10 items-center justify-center rounded-2xl bg-positive-100 text-positive-700 ring-1 ring-positive-200 dark:bg-positive-500/15 dark:text-positive-200 dark:ring-positive-500/25">
                        <MessageCircleIcon className="size-5" />
                      </span>
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="brand" size="sm">
                            WhatsApp
                          </Badge>
                          <Badge variant="positive" size="sm">
                            Fastest reply
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-brand-950 dark:text-brand-100">
                          WhatsApp support
                        </p>
                        <p className="text-xs text-brand-950/75 dark:text-brand-100/80">
                          Fastest for payment, redeem-code, activation, and setup help.
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-brand-950/75 dark:text-brand-100/80">
                      Owner phone: {PUBLIC_OWNER_WHATSAPP_DISPLAY}
                    </p>
                  </div>
                  <a
                    href={PUBLIC_OWNER_WHATSAPP_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      buttonVariants({ variant: 'secondary', size: 'lg' }),
                      'w-full justify-center sm:w-auto'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      Message on WhatsApp
                      <MessageCircleIcon className="size-4" />
                    </span>
                  </a>
                </div>
              </div>

              {props.contactStatus === 'sent' ? (
                <div className="rounded-[1.25rem] border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                  Your message is now stored in the support inbox. The team can
                  reply using the email address you submitted.
                </div>
              ) : null}
              {props.contactStatus === 'invalid' ? (
                <div className="rounded-[1.25rem] border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-sm text-amber-100">
                  Please complete all form fields with a valid email and a message
                  long enough to explain your request.
                </div>
              ) : null}
              {props.contactStatus === 'error' ? (
                <div className="rounded-[1.25rem] border border-rose-500/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
                  The contact form failed to save in the support inbox. Please
                  retry in a moment.
                </div>
              ) : null}

              <form
                action="/api/contact"
                method="POST"
                className="grid gap-5 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 md:p-5"
              >
                <p className="text-xs font-medium tracking-[0.18em] text-neutral-400 uppercase">
                  Send a detailed request
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="contact-name" className="text-neutral-200">
                      Name
                    </Label>
                    <Input
                      id="contact-name"
                      name="name"
                      required
                      placeholder="Your name"
                      className="border-white/10 bg-white/5 text-neutral-50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact-email" className="text-neutral-200">
                      Email
                    </Label>
                    <Input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      placeholder="you@example.com"
                      className="border-white/10 bg-white/5 text-neutral-50"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contact-subject" className="text-neutral-200">
                    Subject
                  </Label>
                  <Input
                    id="contact-subject"
                    name="subject"
                    required
                    placeholder="Billing, activation, setup, or general question"
                    className="border-white/10 bg-white/5 text-neutral-50"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="contact-message" className="text-neutral-200">
                    Message
                  </Label>
                  <Textarea
                    id="contact-message"
                    name="message"
                    rows={7}
                    required
                    placeholder="Tell us what you need help with."
                    className="border-white/10 bg-white/5 text-neutral-50"
                  />
                  <p className="text-xs leading-5 text-neutral-400">
                    Tell us what you need in simple words and we will help you.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" size="lg" variant="secondary">
                    Submit request
                  </Button>
                  <a
                    href="/support"
                    className={buttonVariants({ variant: 'ghost', size: 'lg' })}
                  >
                    Support center
                  </a>
                </div>
              </form>

              <div className="grid gap-3 rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium tracking-[0.18em] text-neutral-400 uppercase">
                    What happens next
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-200">
                    We review your message and reply to the email address you
                    entered.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium tracking-[0.18em] text-neutral-400 uppercase">
                    Reply channel
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-200">
                    Make sure you enter an email address you really use.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {contactCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="rounded-[1.5rem] dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <CardHeader className="gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:border dark:border-brand-300/20 dark:bg-brand-300/12 dark:text-brand-100">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <a
                      href={item.href}
                      className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition hover:text-primary"
                    >
                      <span>{item.cta}</span>
                      <ArrowRightIcon className="size-4" />
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </PublicSection>

      <PublicSection
        id="faq"
        eyebrow="FAQ"
        title="Frequently asked questions"
        description="Quick answers for readers who just want to know how the service works."
        className="pb-20"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {supportFaqs.map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="flex items-start gap-3 text-lg">
                  <LanguagesIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <span>{item.title}</span>
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>
    </PublicShell>
  );
};
