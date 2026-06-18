import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  CoinsIcon,
  KeyRoundIcon,
  MousePointerClickIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersRoundIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  formatCurrency,
  type PublicTokenPack,
  supportFaqs,
} from '@/features/public/data';
import { PublicSection, PublicShell } from '@/features/public/public-shell';
import { TokenPackCard } from '@/features/public/token-pack-card';

interface PagePricingProps {
  tokenPacks: PublicTokenPack[];
}

const pricingNotes = [
  {
    icon: CoinsIcon,
    title: 'Server-controlled subscriptions',
    description:
      'The pricing cards resolve monthly plans on the server and only sell Lemon Squeezy–mapped subscriptions.',
  },
  {
    icon: KeyRoundIcon,
    title: 'Shared redeem codes',
    description:
      'Redeem codes can be shared across devices or people, with usage limited by monthly tokens.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Recurring fulfillment path',
    description:
      'Webhook fulfillment credits monthly tokens after paid billing events so recurring users keep a predictable upgrade and renewal path.',
  },
] as const;

const planFitCards = [
  {
    icon: BookOpenCheckIcon,
    title: 'Trying the workflow',
    description:
      'Start free when you need a low-risk test of OCR quality, app activation, and manga or manhwa translation output.',
  },
  {
    icon: CoinsIcon,
    title: 'Regular reading',
    description:
      'Choose a paid monthly plan when you translate chapters every week and want recurring hosted OCR tokens.',
  },
  {
    icon: UsersRoundIcon,
    title: 'Groups and reviews',
    description:
      'Use a shareable redeem code for approved reading groups, affiliate walkthroughs, or community demos.',
  },
] as const;

const pricingDecisionCards = [
  {
    icon: MousePointerClickIcon,
    title: 'Start free',
    getDescription: (tokenPack: PublicTokenPack | undefined) => {
      if (!tokenPack) {
        return 'Use the free trial to check OCR quality and activation before choosing a paid monthly plan.';
      }

      return `Use ${tokenPack.name} to test about ${tokenPack.marketedChaptersPerMonth} chapters before choosing a paid monthly plan.`;
    },
  },
  {
    icon: SparklesIcon,
    title: 'Upgrade when it becomes weekly',
    getDescription: (tokenPack: PublicTokenPack | undefined) => {
      if (!tokenPack) {
        return 'Pick the regular-reader plan when hosted OCR and AI translation become part of weekly reading.';
      }

      return `${tokenPack.name} is the default upgrade path for repeat readers at ${formatCurrency(tokenPack.priceAmountCents, tokenPack.currency)} per month.`;
    },
  },
  {
    icon: UsersRoundIcon,
    title: 'Ask for review or group access',
    getDescription: (tokenPack: PublicTokenPack | undefined) => {
      if (!tokenPack) {
        return 'Use support when a reviewer, affiliate, or approved reading group needs a dedicated redeem code.';
      }

      return `${tokenPack.name} gives heavier tests about ${tokenPack.marketedChaptersPerMonth} chapters per month before a custom code is needed.`;
    },
  },
] as const;

const revenueSignalCards = [
  {
    icon: BookOpenCheckIcon,
    title: 'Repeat title demand',
    description:
      'Upgrade when the same reader or group translates multiple chapters from the same title instead of testing one page.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Approved-use confidence',
    description:
      'Keep paid pilots focused on owned content, public-domain pages, official samples, or material the tester can process.',
  },
  {
    icon: UsersRoundIcon,
    title: 'Referral-ready access',
    description:
      'Ask support for a dedicated code when a reviewer, affiliate, or group needs trackable activation before sending readers here.',
  },
] as const;

const publicReferralCards = [
  {
    icon: ShieldCheckIcon,
    title: 'Directory or reviewer traffic',
    description:
      'Send visitors to pricing only when the listing can preserve the official APK, free trial, token plans, support route, and responsible-use note.',
  },
  {
    icon: KeyRoundIcon,
    title: 'Dedicated code traffic',
    description:
      'Use support before checkout when a reviewer, affiliate, or approved community needs a trackable redeem code instead of a normal reader plan.',
  },
  {
    icon: MousePointerClickIcon,
    title: 'Ready-to-pay readers',
    description:
      'Move directly to checkout when the reader already tested OCR quality and knows the monthly chapter volume they need.',
  },
] as const;

const commercialFitCards = [
  {
    icon: UsersRoundIcon,
    title: 'Higher-volume reader',
    description:
      'Use normal checkout when the reader already knows the recurring chapter volume and does not need custom access, attribution, or public review context.',
  },
  {
    icon: KeyRoundIcon,
    title: 'Partner or affiliate code',
    description:
      'Ask support for a dedicated code when a partner needs separated attribution, approved-sample testing, or review access before recommending Nayovi.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Custom terms pause',
    description:
      'Pause checkout when the request depends on commercial terms, legal review, investor materials, unsupported metrics, or processing material without clear permission.',
  },
] as const;

const reviewerHandoffCards = [
  {
    icon: ShieldCheckIcon,
    title: 'Verify source first',
    description:
      'Send public traffic to pricing only after the listing preserves the official APK, support, policy, and responsible-use context.',
  },
  {
    icon: KeyRoundIcon,
    title: 'Use codes for reviews',
    description:
      'Route reviewers, affiliates, and approved groups through support when they need scoped access or attribution before checkout.',
  },
  {
    icon: UsersRoundIcon,
    title: 'Keep partner asks separate',
    description:
      'Commercial, investor, legal, media, or creator-platform requests should stay outside normal monthly checkout until scope is clear.',
  },
] as const;

export const PagePricing = (props: PagePricingProps) => {
  const freeTokenPack = props.tokenPacks.find(
    (tokenPack) => tokenPack.key === 'free'
  );
  const paidTokenPacks = props.tokenPacks.filter(
    (tokenPack) => tokenPack.key !== 'free'
  );
  const starterTokenPack =
    paidTokenPacks.find((tokenPack) => tokenPack.key === 'starter') ??
    paidTokenPacks.find((tokenPack) => tokenPack.priceAmountCents === 200) ??
    paidTokenPacks[0];
  const secondaryPaidTokenPacks = paidTokenPacks.filter(
    (tokenPack) => tokenPack.id !== starterTokenPack?.id
  );
  const featuredTokenPack =
    paidTokenPacks.find((tokenPack) => tokenPack.key === 'pro') ??
    secondaryPaidTokenPacks[0] ??
    starterTokenPack;
  const powerTokenPack =
    paidTokenPacks.find((tokenPack) => tokenPack.key === 'power') ??
    paidTokenPacks.at(-1);
  const decisionTokenPacks = [
    freeTokenPack,
    featuredTokenPack,
    powerTokenPack,
  ] as const;

  return (
    <PublicShell>
      <PublicSection
        eyebrow="Plans"
        title="Start with the $2 monthly plan"
        description="The Starter offer is the direct paid entry point for hosted OCR, AI translation, redeem-code activation, and a recurring monthly token plan."
        className="pt-10"
        titleAs="h1"
      >
        {starterTokenPack ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Use Starter when the free trial has proven the workflow and you
                want the smallest recurring checkout path before moving into
                higher monthly chapter volume.
              </p>
              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="font-medium text-foreground">
                    {starterTokenPack.marketedChaptersPerMonth} chapters
                  </p>
                  <p>Estimated monthly volume</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="font-medium text-foreground">Redeem code</p>
                  <p>Activate once in the app</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="font-medium text-foreground">Monthly</p>
                  <p>Renewable hosted access</p>
                </div>
              </div>
            </div>
            <TokenPackCard
              id="starter-plan"
              tokenPack={starterTokenPack}
              featured
            />
          </div>
        ) : null}
      </PublicSection>

      <PublicSection
        eyebrow="Pricing"
        title="Monthly plans for hosted OCR and translation"
        description="These plans support readers coming from TachiyomiAT, Tachiyomi, or Mihon-style workflows who need hosted OCR, AI translation, redeem-code activation, and recurring monthly token access."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {pricingNotes.map((item) => {
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
        eyebrow="Plan fit"
        title="Choose by reading volume"
        description="Nayovi plans are built around practical hosted translation usage: test first, upgrade when reading becomes regular, and use redeem codes when more than one approved reader needs access."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {planFitCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.title}
                className="public-brand-panel-muted rounded-[1.5rem]"
              >
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
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
        eyebrow="Upgrade path"
        title="Turn trial usage into the right monthly plan"
        description="The best subscription signal is repeat reading. Start with the smallest useful test, then upgrade only when the number of translated chapters justifies recurring hosted OCR tokens."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {pricingDecisionCards.map((item, index) => {
            const Icon = item.icon;

            return (
              <Card key={item.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>
                    {item.getDescription(decisionTokenPacks[index])}
                  </CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Referral traffic"
        title="Route public mentions to the right payment path"
        description="Reviewer, affiliate, directory, and community traffic should land on the plan path that matches intent: normal checkout for repeat readers, support for dedicated codes, and no checkout when the source cannot preserve Nayovi's trust context."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {publicReferralCards.map((item) => {
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
        eyebrow="Commercial fit"
        title="Separate normal subscriptions from partner requests"
        description="Pricing should convert repeat readers directly while routing affiliates, reviewers, directories, and approved-sample partners through support when attribution or scope matters."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {commercialFitCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.title}
                className="public-brand-panel-muted rounded-[1.5rem]"
              >
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
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
        eyebrow="Monthly plans"
        title="Real plans, recurring checkout path"
        description="Lemon Squeezy can collect recurring payment from these cards now, and monthly token crediting is finalized from paid invoice webhooks."
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
          {secondaryPaidTokenPacks.map((tokenPack) => (
            <TokenPackCard
              key={tokenPack.id}
              tokenPack={tokenPack}
              featured={tokenPack.id === featuredTokenPack?.id}
            />
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Revenue signals"
        title="Upgrade when the translation habit is real"
        description="Qualified traffic should become paid only after the reader, reviewer, or pilot has a clear repeat-use reason for hosted OCR tokens."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {revenueSignalCards.map((item) => {
            const Icon = item.icon;

            return (
              <Card
                key={item.title}
                className="public-brand-panel-muted rounded-[1.5rem]"
              >
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/support"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Request a pilot code
              <UsersRoundIcon className="size-4" />
            </span>
          </a>
          <a
            href="/guides/translation-support-workflow"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Check responsible use
          </a>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Reviewer handoff"
        title="Send qualified readers to pricing"
        description="Reviews, directories, and partner pilots should route people here only after they can verify the official APK path, activation flow, responsible-use boundary, and reason to choose monthly tokens."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {reviewerHandoffCards.map((item) => {
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

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/download"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Verify APK source
              <ShieldCheckIcon className="size-4" />
            </span>
          </a>
          <a
            href="/guides/permission-safe-manga-translation-pilot"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Review pilot brief
          </a>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="FAQ"
        title="Questions people ask about monthly plans"
        description="The website should set expectations clearly around webhook fulfillment, activation, renewal, and support."
        className="pb-20"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {supportFaqs.map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/how-it-works"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              How activation works
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/support"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Ask about monthly billing
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};
