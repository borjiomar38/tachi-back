import {
  BookOpenCheckIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  DownloadIcon,
  HelpCircleIcon,
  RefreshCwIcon,
  WalletCardsIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import {
  formatCurrency,
  formatTokenCount,
  type PublicTokenPack,
  supportFaqs,
} from '@/features/public/data';
import { androidApkDownload } from '@/features/public/download-assets';
import { PublicShell } from '@/features/public/public-shell';

interface PagePricingProps {
  tokenPacks: PublicTokenPack[];
}

interface PlanAction {
  href: string;
  label: string;
}

const planSteps = [
  {
    title: '1. Download Nayovi',
    description: 'Install the official APK on your Android phone.',
    icon: DownloadIcon,
  },
  {
    title: '2. Try it free',
    description: 'Translate about two average chapters without a card.',
    icon: BookOpenCheckIcon,
  },
  {
    title: '3. Upgrade if you keep reading',
    description: 'Choose the monthly chapter amount that fits your habits.',
    icon: WalletCardsIcon,
  },
] as const;

const resolvePlanAction = (tokenPack: PublicTokenPack): PlanAction => {
  if (tokenPack.key === 'free') {
    return { href: '/download', label: 'Try for free' };
  }

  if (tokenPack.checkoutEnabled) {
    return {
      href: `/checkout/${tokenPack.key}`,
      label: `Choose ${tokenPack.name.split(' ')[0]}`,
    };
  }

  return { href: '/support', label: 'Contact support' };
};

const CompactPlanCard = (props: {
  featured?: boolean;
  id?: string;
  tokenPack: PublicTokenPack;
}) => {
  const { featured = false, tokenPack } = props;
  const isFreePlan = tokenPack.key === 'free';
  const showCoffeePrice = tokenPack.key === 'starter';
  const action = resolvePlanAction(tokenPack);
  const mutedText = featured ? 'text-neutral-300' : 'text-muted-foreground';
  const formattedPrice = formatCurrency(
    tokenPack.priceAmountCents,
    tokenPack.currency,
  );

  return (
    <Card
      id={props.id}
      className={cn(
        'relative h-full scroll-mt-28 rounded-2xl border-border/80 bg-card/80 py-0 shadow-sm backdrop-blur',
        featured &&
          'public-brand-panel text-neutral-50 ring-1 ring-brand-400/35',
      )}
    >
      {featured ? (
        <Badge
          variant="brand"
          size="sm"
          className="absolute -top-3 left-1/2 -translate-x-1/2"
        >
          Most popular
        </Badge>
      ) : null}

      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{tokenPack.name}</h2>
            <p className={cn('mt-1 text-xs leading-5', mutedText)}>
              {tokenPack.marketingSummary}
            </p>
          </div>
          {!featured ? (
            <Badge variant="secondary" size="sm" className="shrink-0">
              {isFreePlan ? 'Free trial' : 'Monthly plan'}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4">
          <div className="flex items-end gap-1">
            <p className="text-3xl font-semibold tracking-tight">
              {isFreePlan
                ? 'Free'
                : showCoffeePrice
                  ? formattedPrice.replace(/\.00$/, '')
                  : formattedPrice}
            </p>
            {!isFreePlan ? (
              <span className={cn('pb-1 text-xs', mutedText)}>/month</span>
            ) : null}
          </div>
          {showCoffeePrice ? (
            <p className={cn('mt-1 text-xs font-medium', mutedText)}>
              The price of a coffee
            </p>
          ) : null}
          <p className={cn('mt-1 text-xs', mutedText)}>
            {isFreePlan
              ? `About ${tokenPack.estimatedChapters} chapters included`
              : `About ${formatTokenCount(tokenPack.marketedChaptersPerMonth)} chapters / month`}
          </p>
        </div>

        <div
          className={cn(
            'mt-4 grid gap-2 border-t pt-3 text-xs',
            featured ? 'border-white/10' : 'border-border/70',
          )}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 shrink-0 text-brand-200" />
            <span>{tokenPack.marketingSummary}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 shrink-0 text-brand-200" />
            <span>{isFreePlan ? 'One-time trial' : 'Renews monthly'}</span>
          </div>
        </div>

        <div className="mt-auto pt-3">
          <a
            href={action.href}
            className={cn(
              buttonVariants({
                variant: featured ? 'secondary' : 'default',
              }),
              'w-full',
            )}
          >
            {action.label}
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export const PagePricing = (props: PagePricingProps) => {
  const freeTokenPack = props.tokenPacks.find(
    (tokenPack) => tokenPack.key === 'free',
  );
  const paidTokenPacks = props.tokenPacks.filter(
    (tokenPack) => tokenPack.key !== 'free',
  );
  const featuredTokenPack =
    paidTokenPacks.find((tokenPack) => tokenPack.key === 'pro') ??
    paidTokenPacks[1] ??
    paidTokenPacks[0];
  const displayedTokenPacks = freeTokenPack
    ? [freeTokenPack, ...paidTokenPacks]
    : paidTokenPacks;

  return (
    <PublicShell compactFooter>
      <section className="relative mx-auto w-full max-w-6xl scroll-mt-24 px-4 pt-8 pb-6 md:pt-10 md:pb-8">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="brand" size="sm">
            Plans
          </Badge>
          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
            Choose a plan for your manhwa and manga reading.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Try Nayovi free. Upgrade only when full-chapter translation becomes
            part of your reading.
          </p>
          <a
            href={androidApkDownload.href}
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'mt-4 min-h-12 px-8',
            )}
          >
            Try Nayovi free
          </a>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs leading-5 text-muted-foreground sm:text-sm">
            <RefreshCwIcon className="size-4 shrink-0" />
            Monthly plans renew automatically. Unused allowance resets at
            renewal. Cancel from your billing link.
          </p>
        </div>

        <div className="mt-6 grid gap-3 text-left sm:grid-cols-2 xl:grid-cols-4">
          {displayedTokenPacks.map((tokenPack) => (
            <CompactPlanCard
              key={tokenPack.id}
              tokenPack={tokenPack}
              featured={tokenPack.id === featuredTokenPack?.id}
              id={tokenPack.key === 'starter' ? 'starter-plan' : undefined}
            />
          ))}
        </div>

        <Card className="mt-4 rounded-2xl border-border/80 bg-card/70 py-0 backdrop-blur">
          <CardContent className="grid gap-4 p-4 md:grid-cols-3 md:p-5">
            {planSteps.map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.title} className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-300/15 text-brand-200 ring-1 ring-brand-300/20">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-sm font-semibold">{step.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="mt-3 rounded-2xl border-brand-300/20 bg-brand-300/5 py-0">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-300/15 text-brand-200">
              <HelpCircleIcon className="size-5" />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 className="text-sm font-semibold">
                What counts as a chapter?
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
                The amounts shown are simple estimates. Manhwa and manga
                chapters vary in length, so your actual monthly total can be a
                little higher or lower.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section
        id="faq"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pt-4 pb-10 md:pb-12"
      >
        <div className="mb-4">
          <Badge variant="brand" size="sm">
            FAQ
          </Badge>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
            Questions about the free trial and monthly plans
          </h2>
        </div>

        <div className="grid items-start gap-2 lg:grid-cols-2">
          {supportFaqs.map((item) => (
            <details
              key={item.title}
              className="group rounded-xl border border-border/80 bg-card/65 backdrop-blur open:bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold outline-none transition hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
                <span>{item.title}</span>
                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="border-t border-border/70 px-4 py-3 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </details>
          ))}
        </div>
      </section>
    </PublicShell>
  );
};
