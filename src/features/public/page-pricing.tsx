import { ArrowRightIcon, CoinsIcon, KeyRoundIcon, ShieldCheckIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { type PublicTokenPack,supportFaqs } from '@/features/public/data';
import { PublicSection, PublicShell } from '@/features/public/public-shell';
import { TokenPackCard } from '@/features/public/token-pack-card';

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
      'Webhook fulfillment credits monthly tokens after paid billing events, while refund tooling and some recovery flows remain follow-up work.',
  },
] as const;

export const PagePricing = (props: { tokenPacks: PublicTokenPack[] }) => {
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

  return (
    <PublicShell>
      <PublicSection
        eyebrow="Pricing"
        title="Monthly plans for hosted OCR and translation"
        description="These public cards are sourced from the seeded plan data in Postgres, and Lemon Squeezy checkout now starts recurring monthly subscriptions for plans with a configured Lemon Squeezy price."
        className="pt-10"
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
        eyebrow="Monthly plans"
        title="Real plans, recurring checkout path"
        description="Lemon Squeezy can collect recurring payment from these cards now, and monthly token crediting is finalized from paid invoice webhooks."
      >
        {freeTokenPack ? (
          <div className="mx-auto mb-4 w-full max-w-xl">
            <TokenPackCard
              tokenPack={freeTokenPack}
              featured={false}
            />
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
