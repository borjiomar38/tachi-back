import {
  LockKeyholeIcon,
  MailIcon,
  ShoppingCartIcon,
  SmartphoneIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TokenPurchaseSteps = () => {
  const { t } = useTranslation(['tokens', 'common']);
  const steps = [
    {
      icon: ShoppingCartIcon,
      title: t('tokens:steps.choose'),
      body: t('tokens:steps.chooseBody'),
    },
    {
      icon: LockKeyholeIcon,
      title: t('tokens:steps.pay'),
      body: t('tokens:steps.payBody'),
    },
    {
      icon: SmartphoneIcon,
      title: t('tokens:steps.return'),
      body: t('tokens:steps.returnBody'),
    },
  ];
  return (
    <div className="mt-8">
      <div className="grid gap-6 rounded-2xl border border-[#392849] bg-[#120f1b]/80 p-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#2b233e] text-[#b8a5df]">
              <step.icon aria-hidden className="size-6" />
            </div>
            <div>
              <p className="font-semibold text-white">
                {index + 1}. {step.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-[#bcb0da]">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-[#bcb0da]">
        <MailIcon aria-hidden className="size-4" />
        {t('tokens:emailBackup')}
      </p>
      <a
        href="/app/payment"
        className="mt-2 block text-center text-sm text-[#c9b6f4] underline underline-offset-4"
      >
        {t('tokens:alreadyCode')}
      </a>
    </div>
  );
};
