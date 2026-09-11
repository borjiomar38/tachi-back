import { BookOpenTextIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const FreeAppNotice = () => {
  const { t } = useTranslation(['tokens', 'common']);
  return (
    <div className="text-sm leading-6 text-[#beb3de]">
      <p className="font-medium text-[#eee8ff]">{t('tokens:freeTitle')}</p>
      <p>{t('tokens:freeBody')}</p>
    </div>
  );
};
export const TokenUsageNotice = () => {
  const { t } = useTranslation(['tokens', 'common']);
  return (
    <div className="inline-flex items-center gap-4 rounded-2xl border border-[#493465] bg-[#281c3d]/70 px-5 py-3 text-left">
      <BookOpenTextIcon
        aria-hidden
        className="size-8 shrink-0 text-[#b9a8e5]"
      />
      <div className="text-sm leading-6">
        <p className="font-medium text-[#f5f0ff]">{t('tokens:variableCost')}</p>
        <p className="text-[#bcb0da]">{t('tokens:automaticUsage')}</p>
      </div>
    </div>
  );
};
