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
    title: 'Server-controlled checkout',
    description:
      'The pricing cards resolve token packs on the server and only sell Stripe-mapped packs.',
  },
  {
    icon: KeyRoundIcon,
    title: 'No account signup path',
    description:
      'Activation is planned around redeem codes and installation binding, not customer dashboards.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Fulfillment still deferred',
    description:
      'Webhook crediting, redeem codes, device recovery, and refund tooling stay in later phases.',
  },
] as const;

export const PagePricing = (props: { tokenPacks: PublicTokenPack[] }) => {
  const featuredTokenPack =
    props.tokenPacks.find((tokenPack) => tokenPack.key === 'pro') ??
    props.tokenPacks[1] ??
    props.tokenPacks[0];

  return (
    <PublicShell>
      <PublicSection
        eyebrow="Pricing"
        title="Token packs for hosted OCR and translation"
        description="These public cards are sourced from the seeded token-pack data in Postgres, and Phase 6 adds the first trusted Stripe checkout path for packs with a configured Stripe price."
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
        eyebrow="Token packs"
        title="Real packs, first checkout path"
        description="Stripe can collect payment from these cards now, but token ledger posting, redeem-code generation, and activation still land in the next phases."
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
        eyebrow="FAQ"
        title="Questions pricing still needs to answer after checkout exists"
        description="The website should set expectations now so later webhook, activation, and support work has less customer ambiguity."
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
            Ask about activation timing
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};
