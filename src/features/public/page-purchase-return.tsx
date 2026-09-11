import {
  CheckCircle2Icon,
  LoaderCircleIcon,
  MailIcon,
  SmartphoneIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { envClient } from '@/env/client';
import { PublicShell } from '@/features/public/public-shell';
import { buildNayoviIntentLink } from '@/features/public/purchase-links';
import { tokenGoldButton } from '@/features/public/token-pack-card';
import { FreeAppNotice } from '@/features/public/token-usage-notice';
import { usePurchaseReturn } from '@/features/public/use-purchase-return';

export const PagePurchaseReturn = () => {
  const { t } = useTranslation(['tokens', 'common']);
  const { ticket, loaded, status } = usePurchaseReturn();
  const paid = status.data?.state === 'paid';
  const activated = paid && status.data?.activated;
  const unavailable =
    Boolean(status.error) ||
    Boolean(status.data && !['pending', 'paid'].includes(status.data.state));
  const emailMessage = () => {
    if (status.data?.emailSent) return t('tokens:emailSent');
    if (paid) return t('tokens:emailPending');
    return t('tokens:emailAfterPayment');
  };
  const title = () => {
    if (unavailable) return t('tokens:expired');
    if (activated) return t('tokens:activated');
    if (paid) return t('tokens:confirmed');
    if (!ticket) return t('tokens:returnTitle');
    return t('tokens:pending');
  };
  const body = () => {
    if (unavailable) return t('tokens:expiredBody');
    if (activated) return t('tokens:activatedBody');
    if (paid)
      return t('tokens:confirmedBody', {
        count: status.data?.totalTokens ?? 0,
      });
    return ticket ? t('tokens:pendingBody') : t('tokens:noTicket');
  };
  return (
    <PublicShell compactFooter>
      <section className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-3xl border border-[#ead074] bg-linear-to-br from-[#322341] to-[#100c19] p-6 text-white sm:p-8">
          <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-[#4e346d] text-[#ffe171]">
            {paid ? (
              <CheckCircle2Icon aria-hidden className="size-7" />
            ) : (
              <SmartphoneIcon aria-hidden className="size-7" />
            )}
          </div>
          <h1 className="text-2xl font-semibold" role="status">
            {title()}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#bcb0da]">{body()}</p>
          {status.isFetching && (
            <LoaderCircleIcon
              aria-label={t('tokens:pending')}
              className="mt-3 size-5 animate-spin"
            />
          )}
          {loaded && (
            <a
              href={buildNayoviIntentLink(
                window.location.origin,
                unavailable ? null : ticket,
                envClient.VITE_ANDROID_APP_ID
              )}
              referrerPolicy="no-referrer"
              className={`${tokenGoldButton} mt-6 w-full`}
            >
              {t('tokens:openApp')}
            </a>
          )}
          {ticket && (
            <button
              type="button"
              onClick={() => void status.refetch()}
              disabled={status.isFetching}
              className="mt-4 block w-full text-sm text-[#c9b6f4] underline disabled:opacity-50"
            >
              {t('tokens:retry')}
            </button>
          )}
          <p className="mt-6 flex gap-2 text-xs leading-5 text-[#bcb0da]">
            <MailIcon aria-hidden className="size-4 shrink-0" />
            {emailMessage()}
          </p>
          <p className="mt-2 text-xs leading-5 text-[#bcb0da]">
            {t('tokens:footerHelp')}
          </p>
          <div className="mt-6 border-t border-[#493465] pt-5">
            <FreeAppNotice />
          </div>
        </div>
        <p className="mt-6 text-center text-sm text-[#bcb0da]">
          {t('tokens:noApp')}{' '}
          <a href="/download" className="text-[#c9b6f4] underline">
            {t('tokens:download')}
          </a>
        </p>
        <a
          href="/support"
          className="mt-4 block text-center text-sm text-[#c9b6f4] underline"
        >
          {t('tokens:support')}
        </a>
      </section>
    </PublicShell>
  );
};
