import { CheckCircle2Icon, RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ContactTriageAutomationCardProps {
  analyzed: number;
  failed: number;
  lastAnalyzedAt: Date | null | undefined;
  loading: boolean;
  onRetryFailed: () => void;
  total: number;
}

export const ContactTriageAutomationCard = ({
  analyzed,
  failed,
  lastAnalyzedAt,
  loading,
  onRetryFailed,
  total,
}: ContactTriageAutomationCardProps) => {
  const { t } = useTranslation(['contact']);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-2 font-medium text-positive-600 dark:text-positive-300">
            <CheckCircle2Icon className="size-4" />
            {t('contact:inbox.automation.active')}
          </span>
          <span className="text-muted-foreground">
            {t('contact:inbox.automation.analyzed', { analyzed, total })}
          </span>
          <span className="text-muted-foreground">
            {lastAnalyzedAt
              ? t('contact:inbox.automation.lastRun', {
                  relativeTime: new Intl.RelativeTimeFormat(undefined, {
                    numeric: 'auto',
                  }).format(
                    Math.round(
                      (lastAnalyzedAt.getTime() - Date.now()) / 60_000
                    ),
                    'minute'
                  ),
                })
              : t('contact:inbox.automation.waiting')}
          </span>
        </div>
        {failed ? (
          <Button
            size="sm"
            variant="secondary"
            loading={loading}
            onClick={onRetryFailed}
          >
            <RefreshCwIcon />
            {t('contact:inbox.automation.retryFailed')}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
};
