import { useQuery } from '@tanstack/react-query';
import { BookOpenTextIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { orpc } from '@/lib/orpc/client';

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
  const costs = useQuery({ ...orpc.tokenPurchase.consumption.queryOptions(), staleTime: 30_000 });
  const chapterCost = costs.data?.chapterModes.find((mode) => mode.key === 'standard')?.tokenCost;
  const searchCost = costs.data?.advancedSearch.tokenCost;
  return (
    <div className="inline-flex items-center gap-4 rounded-2xl border border-[#493465] bg-[#281c3d]/70 px-5 py-3 text-left">
      <BookOpenTextIcon
        aria-hidden
        className="size-8 shrink-0 text-[#b9a8e5]"
      />
      <div className="text-sm leading-6">
        {chapterCost != null && searchCost != null ? <>
          <p className="font-medium text-[#f5f0ff]">{t('tokens:chapterCost', { count: chapterCost })}</p>
          <p className="text-[#bcb0da]">{t('tokens:advancedSearchCost', { count: searchCost })}</p>
        </> : <p role="status">{t(costs.isError ? 'tokens:costsUnavailable' : 'tokens:costsLoading')}</p>}
        {costs.isError && <button type="button" onClick={() => void costs.refetch()} className="text-[#c9b6f4] underline">{t('tokens:retry')}</button>}
      </div>
    </div>
  );
};
