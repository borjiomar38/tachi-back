import { useTranslation } from 'react-i18next';

import type { PublicTokenPack } from '@/features/public/data';
import { PublicShell } from '@/features/public/public-shell';
import { TokenPackCard } from '@/features/public/token-pack-card';
import { getBestValuePackId } from '@/features/public/token-pack-policy';
import { TokenPurchaseSteps } from '@/features/public/token-purchase-steps';
import {
  FreeAppNotice,
  TokenUsageNotice,
} from '@/features/public/token-usage-notice';

interface PagePricingProps {
  tokenPacks: PublicTokenPack[];
}
export const PagePricing = ({ tokenPacks }: PagePricingProps) => {
  const { t } = useTranslation(['tokens', 'common']);
  const packs = tokenPacks.filter((pack) => pack.key !== 'free');
  const featured =
    packs.find((pack) => pack.key === 'pro-tokens') ?? packs[1] ?? packs[0];
  const bestValue = getBestValuePackId(packs);
  return (
    <PublicShell compactFooter>
      <section className="mx-auto w-full max-w-6xl px-4 pt-8 pb-12 md:pt-10">
        <header className="mx-auto max-w-4xl text-center">
          <span className="rounded-full bg-[#392050]/70 px-4 py-1 text-xs font-medium text-[#ddd0f8]">
            {t('tokens:label')}
          </span>
          <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight text-balance md:text-4xl">
            {t('tokens:title')}
          </h1>
          <p className="mt-3 text-base text-[#bcb0da] md:text-lg">
            {t('tokens:subtitle')}
          </p>
          <div className="mt-4">
            <FreeAppNotice />
          </div>
          <div className="mt-5">
            <TokenUsageNotice />
          </div>
        </header>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {packs.map((pack) => (
            <TokenPackCard
              key={pack.id}
              tokenPack={pack}
              featured={pack.id === featured?.id}
              bestValue={pack.id === bestValue}
              id={pack.key === 'starter-tokens' ? 'starter-plan' : undefined}
            />
          ))}
        </div>
        {packs.length === 0 && (
          <p role="status" className="py-10 text-center text-[#c9bee1]">
            {t('tokens:unavailable')} ·{' '}
            <a href="/support" className="underline">
              {t('tokens:support')}
            </a>
          </p>
        )}
        {tokenPacks.some((pack) => pack.key === 'free') && (
          <a
            href="/download"
            className="mt-5 block text-center text-sm text-[#c9b6f4] underline underline-offset-4"
          >
            {t('tokens:newUser')}
          </a>
        )}
        <TokenPurchaseSteps />
      </section>
    </PublicShell>
  );
};
