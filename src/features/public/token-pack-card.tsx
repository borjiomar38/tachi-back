import { cva } from 'class-variance-authority';
import { ChevronRightIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/tailwind/utils';

import { formatCurrency, type PublicTokenPack } from '@/features/public/data';

export const tokenGoldButton =
  'inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#ffed93] bg-linear-to-b from-[#ffe778] to-[#ffc44c] px-5 py-3 font-semibold text-[#211506] shadow-[0_3px_18px_#f8c84b20] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe173] disabled:cursor-not-allowed disabled:opacity-45';
const cardVariants = cva(
  'flex h-full flex-col rounded-2xl border px-6 py-6 text-white',
  {
    variants: {
      featured: {
        true: 'border-[#ffe166] bg-linear-to-br from-[#3b1c63] to-[#140e21] shadow-[0_0_20px_#f7d35115]',
        false: 'border-[#423053] bg-[#120f1c]/90',
      },
    },
  }
);
interface TokenPackCardProps {
  tokenPack: PublicTokenPack;
  featured?: boolean;
  bestValue?: boolean;
  compact?: boolean;
  showCoffeePrice?: boolean;
  id?: string;
}
export const TokenPackCard = ({
  tokenPack,
  featured = false,
  bestValue = false,
  id,
}: TokenPackCardProps) => {
  const { t } = useTranslation(['tokens', 'common']);
  const isFree = tokenPack.key === 'free';
  const summaries = {
    'starter-tokens': t('tokens:packDescriptions.starter'),
    'pro-tokens': t('tokens:packDescriptions.pro'),
    'power-tokens': t('tokens:packDescriptions.power'),
  };
  const description =
    tokenPack.description ??
    summaries[tokenPack.key as keyof typeof summaries] ??
    t('tokens:subtitle');
  return (
    <article id={id} className={cardVariants({ featured })}>
      <div className="flex min-h-8 flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">{tokenPack.name}</h2>
        {bestValue && (
          <span className="rounded-full border border-[#dfad32] bg-[#8b5a1020] px-3 py-1 text-xs font-medium text-[#ffdc65]">
            {t('tokens:bestValue')}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-3 border-b border-[#463451] pb-5 text-[#ffdc64]">
        <img
          src="/images/tokens/nayovi-token.png"
          alt=""
          className="size-12 shrink-0 object-contain"
        />
        <p className="text-3xl font-bold tracking-tight">
          {t('tokens:tokens', { count: tokenPack.totalTokens })}
        </p>
      </div>
      <p className="mt-5 text-4xl font-bold tracking-tight">
        {formatCurrency(tokenPack.priceAmountCents, tokenPack.currency)}
      </p>
      <p className="mt-1 text-sm text-[#bcb0da]">
        {isFree ? t('tokens:trial') : t('tokens:oneTime')}
      </p>
      <p className="mt-4 mb-5 text-sm leading-6 text-[#bcb0da]">
        {isFree ? t('tokens:tryFirst') : description}
      </p>
      <div className="mt-auto">
        {isFree && (
          <a href="/download" className={cn(tokenGoldButton, 'w-full')}>
            {t('tokens:trial')}
          </a>
        )}
        {!isFree && tokenPack.checkoutEnabled && (
          <a
            href={`/checkout/${tokenPack.key}`}
            className={cn(tokenGoldButton, 'w-full')}
          >
            {t('tokens:buy', { count: tokenPack.totalTokens })}
            <ChevronRightIcon aria-hidden className="size-5" />
          </a>
        )}
        {!isFree && !tokenPack.checkoutEnabled && (
          <div className="space-y-2 text-center">
            <button disabled className={cn(tokenGoldButton, 'w-full')}>
              {t('tokens:unavailable')}
            </button>
            <a href="/support" className="text-xs text-[#c9bee1] underline">
              {t('tokens:support')}
            </a>
          </div>
        )}
      </div>
    </article>
  );
};
