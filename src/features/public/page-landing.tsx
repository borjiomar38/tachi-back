import {
  ArrowRightIcon,
  CoinsIcon,
  KeyRoundIcon,
  LanguagesIcon,
  MailIcon,
  ServerIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
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

import {
  activationSteps,
  PUBLIC_SUPPORT_EMAIL,
  publicHighlights,
  type PublicTokenPack,
  supportFaqs,
} from '@/features/public/data';
import { PublicSection, PublicShell } from '@/features/public/public-shell';
import { TokenPackCard } from '@/features/public/token-pack-card';

const highlightIcons = [
  ServerIcon,
  KeyRoundIcon,
  CoinsIcon,
  ShieldCheckIcon,
] as const;

const contactCards = [
  {
    title: 'Billing and packs',
    description:
      'Questions about token packs, checkout, receipts, or which hosted plan to start with.',
    href: '/pricing',
    cta: 'View pricing',
    icon: CoinsIcon,
  },
  {
    title: 'Activation and devices',
    description:
      'Need help with redeem codes, device binding, or recovering access on a new installation.',
    href: '/support',
    cta: 'Open support',
    icon: KeyRoundIcon,
  },
  {
    title: 'Download and setup',
    description:
      'See the current Android state, hosted roadmap, and how TachiyomiAT fits into the flow.',
    href: '/download',
    cta: 'Read setup guide',
    icon: SmartphoneIcon,
  },
  {
    title: 'General contact',
    description:
      'Reach the team directly for roadmap, launch-readiness, or support questions.',
    href: `mailto:${PUBLIC_SUPPORT_EMAIL}`,
    cta: PUBLIC_SUPPORT_EMAIL,
    icon: MailIcon,
  },
] as const;

export const PageLanding = (props: { tokenPacks: PublicTokenPack[] }) => {
  const featuredTokenPack =
    props.tokenPacks.find((tokenPack) => tokenPack.key === 'pro') ??
    props.tokenPacks[1] ??
    props.tokenPacks[0];

  return (
    <PublicShell>
      <section
        id="hero"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-8 md:py-14"
      >
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-background/90 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] ring-1 ring-black/5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
          <div className="grid gap-10 px-6 py-8 md:px-10 md:py-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Badge variant="warning" size="sm">
                Hosted OCR launch surface
              </Badge>
              <div className="space-y-4">
                <p className="text-sm font-medium tracking-[0.24em] text-muted-foreground uppercase">
                  Hosted OCR + translation for TachiyomiAT
                </p>
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
                  Sell token-based OCR and translation without exposing
                  provider keys on the device.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                  Tachiyomi Back is the backend and backoffice layer for hosted
                  OCR, translation, token packs, redeem-code activation, and
                  support operations around TachiyomiAT.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/#pricing"
                  className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
                >
                  <span className="flex items-center gap-2">
                    See token packs
                    <ArrowRightIcon className="size-4" />
                  </span>
                </a>
                <a
                  href="/#demo"
                  className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                  See the demo
                </a>
                <a
                  href="/#contact"
                  className={buttonVariants({ variant: 'ghost', size: 'lg' })}
                >
                  Contact the team
                </a>
              </div>

              <Card className="rounded-[1.5rem] border-warning-200 bg-warning-50/80 dark:border-warning-900/60 dark:bg-warning-950/15">
                <CardHeader className="gap-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <SmartphoneIcon className="size-5" />
                    Current Android reality
                  </CardTitle>
                  <CardDescription className="text-warning-900 dark:text-warning-100">
                    TachiyomiAT still ships local translators and asks users to
                    provide their own API keys for hosted providers today.
                    This public site explains the hosted direction without
                    pretending the mobile integration already ships.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>

            <div className="grid gap-4">
              <Card className="overflow-hidden rounded-[1.5rem] border-neutral-900 bg-neutral-950 text-neutral-50">
                <CardContent className="p-0">
                  <div className="border-b border-white/10 px-5 py-4">
                    <p className="text-sm font-medium tracking-[0.22em] text-neutral-300 uppercase">
                      Branded preview
                    </p>
                    <p className="mt-2 text-lg font-semibold">
                      Hosted OCR, translation, tokens, and device activation in
                      one visual.
                    </p>
                  </div>
                  <img
                    src="/tachiyomi-back-hero.svg"
                    alt="Tachiyomi Back illustration showing manga OCR, translated output, tokens, and device activation"
                    className="block w-full"
                  />
                </CardContent>
              </Card>

              <Card className="rounded-[1.5rem]">
                <CardHeader className="gap-2">
                  <CardTitle className="text-xl">At a glance</CardTitle>
                  <CardDescription>
                    The hosted product is designed around backend routing,
                    token packs, and device-bound activation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-xl border border-border/70 px-3 py-3">
                    Server-side OCR and translation providers keep keys off the
                    device.
                  </div>
                  <div className="rounded-xl border border-border/70 px-3 py-3">
                    Stripe checkout sells token packs without forcing a user
                    account.
                  </div>
                  <div className="rounded-xl border border-border/70 px-3 py-3">
                    Redeem codes and device binding connect paid usage to a
                    TachiyomiAT installation.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <PublicSection
        id="demo"
        eyebrow="Demo"
        title="See the hosted workflow before Android launch"
        description="The demo section now pairs a real Tachiyomi walkthrough video with the hosted backend flow: tokens, redeem-code activation, backend OCR and translation, and results that keep the existing reader output contract."
      >
        <Card className="mb-4 overflow-hidden rounded-[1.75rem] border-neutral-900 bg-neutral-950 text-neutral-50">
          <CardHeader className="gap-2 border-b border-white/10">
            <CardTitle className="text-2xl">
              Video demo: How to Use Tachiyomi App
            </CardTitle>
            <CardDescription className="text-neutral-300">
              This YouTube demo shows the baseline Tachiyomi experience first.
              Your hosted OCR and translation flow extends that same app usage
              pattern instead of replacing it with a separate reader.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-0 lg:grid-cols-[1.15fr_0.85fr]">
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
            <div className="p-6">
              <p className="text-sm font-medium tracking-[0.2em] text-neutral-400 uppercase">
                Why it matters
              </p>
              <div className="mt-4 grid gap-3 text-sm text-neutral-200">
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  It gives users the core Tachiyomi reading context before they
                  see hosted features like tokens and redemption.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  The backend product fits into that same chapter-reading flow:
                  upload pages, process OCR and translation, then return
                  reader-ready output.
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  That makes the hosted service easier to explain to users who
                  already know Tachiyomi or are learning it for the first time.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="overflow-hidden rounded-[1.75rem] border-neutral-900 bg-neutral-950 text-neutral-50">
            <CardHeader className="gap-2 border-b border-white/10">
              <CardTitle className="text-2xl">Hosted reader pipeline</CardTitle>
              <CardDescription className="text-neutral-300">
                A page-level translation job moves from device upload to
                backend OCR and translation, then comes back as the same
                reader-ready structure TachiyomiAT already understands.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 p-6">
              <div className="grid gap-4 lg:grid-cols-[0.92fr_auto_1.08fr] lg:items-center">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-medium tracking-[0.2em] text-neutral-400 uppercase">
                    On device
                  </p>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="rounded-xl bg-white/5 px-3 py-3">
                      Select the hosted translator inside TachiyomiAT.
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-3">
                      Redeem once and upload chapter pages through the backend.
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-3">
                      Poll for status and store the final chapter JSON locally.
                    </div>
                  </div>
                </div>
                <div className="hidden justify-center lg:flex">
                  <ArrowRightIcon className="size-7 text-warning-300" />
                </div>
                <div className="rounded-[1.25rem] bg-white p-4 text-neutral-950">
                  <p className="text-sm font-medium tracking-[0.2em] text-neutral-500 uppercase">
                    On backend
                  </p>
                  <div className="mt-4 grid gap-3 text-sm">
                    <div className="rounded-xl bg-neutral-100 px-3 py-3">
                      OCR providers extract text blocks and coordinates.
                    </div>
                    <div className="rounded-xl bg-neutral-100 px-3 py-3">
                      Translation providers rewrite text without exposing keys.
                    </div>
                    <div className="rounded-xl bg-neutral-100 px-3 py-3">
                      Token ledger, device binding, and result storage stay
                      server-controlled.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-white/10 bg-gradient-to-r from-warning-400/15 to-positive-400/10 px-4 py-4">
                <p className="text-sm font-medium tracking-[0.2em] text-neutral-300 uppercase">
                  Output contract
                </p>
                <p className="mt-2 text-sm leading-7 text-neutral-200">
                  The backend returns translated page data that preserves page
                  order, geometry, and reader compatibility instead of forcing
                  a brand-new mobile rendering model.
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
        id="pricing"
        eyebrow="Pricing"
        title="Pricing backed by real token packs"
        description="Customers buy hosted usage as token packs. Stripe checkout is server-controlled, and only packs with an active Stripe price can be purchased."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {props.tokenPacks.map((tokenPack) => (
            <TokenPackCard
              key={tokenPack.id}
              tokenPack={tokenPack}
              featured={tokenPack.id === featuredTokenPack?.id}
            />
          ))}
        </div>
      </PublicSection>

      <PublicSection
        id="contact"
        eyebrow="Contact"
        title="Contact paths for billing, setup, and support"
        description="The landing page should make it obvious where customers go next, even before every hosted support workflow is fully automated."
      >
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[1.75rem] border-neutral-900 bg-neutral-950 text-neutral-50">
            <CardHeader className="gap-2">
              <CardTitle className="text-2xl">Talk to Tachiyomi Back</CardTitle>
              <CardDescription className="text-neutral-300">
                Use the support email for billing questions, device-binding
                issues, redeem-code help, or launch discussions around hosted
                OCR and translation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-sm font-medium tracking-[0.22em] text-neutral-400 uppercase">
                  Primary contact
                </p>
                <p className="mt-3 text-2xl font-semibold">{PUBLIC_SUPPORT_EMAIL}</p>
                <p className="mt-2 text-sm leading-7 text-neutral-300">
                  This is the current support path for questions about pricing,
                  hosted activation, token access, and the public rollout.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
                  className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                  Email support
                </a>
                <a
                  href="/support"
                  className={buttonVariants({ variant: 'ghost', size: 'lg' })}
                >
                  Support center
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {contactCards.map((item) => {
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
        title="Public FAQ before launch"
        description="The landing page answers the main questions about tokens, providers, privacy, activation, and device support before customers ever enter checkout."
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
