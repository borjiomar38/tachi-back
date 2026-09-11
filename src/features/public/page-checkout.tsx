import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { formatCurrency, type PublicTokenPack } from '@/features/public/data';
import { PublicShell } from '@/features/public/public-shell';
import { tokenGoldButton } from '@/features/public/token-pack-card';
import {
  FreeAppNotice,
  TokenUsageNotice,
} from '@/features/public/token-usage-notice';

interface PageCheckoutProps {
  search: { email?: string; error?: string };
  tokenPack: PublicTokenPack | null;
  tokenPackKey: string;
}
export const PageCheckout = ({ tokenPack, search }: PageCheckoutProps) => {
  const { t } = useTranslation(['tokens', 'common']);
  const { register } = useForm<{ payerEmail: string }>({
    defaultValues: { payerEmail: search.email ?? '' },
  });
  return (
    <PublicShell compactFooter>
      <section className="mx-auto max-w-xl px-4 py-10">
        <a href="/pricing" className="text-sm text-[#c9b6f4] underline">
          {t('tokens:back')}
        </a>
        <div className="mt-6 rounded-3xl border border-[#ead074] bg-linear-to-br from-[#31223e] to-[#110d1c] p-6 text-white">
          <h1 className="text-2xl font-semibold">
            {tokenPack
              ? t('tokens:checkoutTitle', { name: tokenPack.name })
              : t('tokens:unavailable')}
          </h1>
          <div className="mt-4">
            <FreeAppNotice />
          </div>
          {tokenPack && (
            <>
              <div className="my-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#493465] bg-[#281c3d] p-4">
                <div className="flex items-center gap-2">
                  <img
                    src="/images/tokens/nayovi-token.png"
                    alt=""
                    className="size-10"
                  />
                  <strong className="text-xl text-[#ffdc64]">
                    {t('tokens:tokens', { count: tokenPack.totalTokens })}
                  </strong>
                </div>
                <div>
                  <p className="text-xl font-semibold">
                    {formatCurrency(
                      tokenPack.priceAmountCents,
                      tokenPack.currency
                    )}
                  </p>
                  <p className="text-xs text-[#bcb0da]">
                    {t('tokens:oneTime')}
                  </p>
                </div>
              </div>
              <TokenUsageNotice />
              {search.error && (
                <p role="alert" className="text-rose-200 mt-4 text-sm">
                  {t('tokens:checkoutError')}
                </p>
              )}
              {!tokenPack.checkoutEnabled && (
                <p role="status" className="mt-4 text-sm text-[#bcb0da]">
                  {t('tokens:checkoutUnavailable')}
                </p>
              )}
              <form
                action="/api/payments/checkout"
                method="POST"
                className="mt-6 grid gap-3"
              >
                <input
                  type="hidden"
                  name="tokenPackKey"
                  value={tokenPack.key}
                />
                <label htmlFor="payer-email" className="text-sm font-medium">
                  {t('tokens:email')}
                </label>
                <input
                  id="payer-email"
                  {...register('payerEmail', { required: true })}
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={320}
                  className="min-h-12 rounded-xl border border-[#675477] bg-[#1c152a] px-4 text-white focus-visible:outline-2 focus-visible:outline-[#ffe173]"
                />
                <p className="text-xs leading-5 text-[#bcb0da]">
                  {t('tokens:emailHelp')}
                </p>
                <button
                  className={tokenGoldButton}
                  type="submit"
                  disabled={!tokenPack.checkoutEnabled}
                >
                  {t('tokens:continue')}
                </button>
                <p className="text-center text-xs text-[#bcb0da]">
                  {t('tokens:totalAtCheckout')}
                </p>
              </form>
            </>
          )}
          <a
            href="/support"
            className="mt-5 block text-center text-sm text-[#c9b6f4] underline"
          >
            {t('tokens:support')}
          </a>
        </div>
      </section>
    </PublicShell>
  );
};
