import {
  BellOffIcon,
  BellRingIcon,
  Clock3Icon,
  ShieldAlertIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ContactTriageBadge } from '@/features/contact/manager/contact-triage-badge';
import type { ContactTriageView } from '@/server/contact/schema';

interface ContactTriageCardProps {
  actions?: ReactNode;
  triage: ContactTriageView;
}

export const ContactTriageCard = ({
  actions,
  triage,
}: ContactTriageCardProps) => {
  const { t } = useTranslation(['contact']);
  const isDanger =
    triage.classification === 'malicious' || triage.state === 'failed';
  const RoutingIcon =
    triage.notification === 'suppressed' ? BellOffIcon : BellRingIcon;

  return (
    <Card
      className={cn(
        isDanger && 'border-negative-500/45 dark:border-negative-500/55'
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlertIcon
            className={cn(
              'size-5 text-muted-foreground',
              isDanger && 'text-negative-500'
            )}
          />
          <CardTitle>{t('contact:triage.title')}</CardTitle>
        </div>
        <ContactTriageBadge triage={triage} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          {triage.reason ?? t('contact:triage.notAnalyzed')}
        </p>

        {triage.tags.length ? (
          <div className="flex flex-wrap gap-2">
            {triage.tags.map((tag) => (
              <Badge key={tag} variant="negative" size="sm">
                {t(`contact:triage.tags.${tag}`)}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-border/70 py-3 text-xs text-muted-foreground">
          <div className="inline-flex items-center gap-2">
            <Clock3Icon className="size-3.5" />
            {triage.analyzedAt
              ? t('contact:triage.analyzedAutomatically', {
                  date: new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(triage.analyzedAt),
                })
              : t('contact:triage.notAnalyzed')}
          </div>
          <span>
            {t('contact:triage.attempts', { count: triage.attempts })}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border/70 bg-muted/20 px-3 py-3 text-sm">
          <span className="inline-flex items-center gap-2 font-medium">
            <RoutingIcon className="size-4 text-muted-foreground" />
            {t('contact:triage.supportNotification')}
          </span>
          <span className="text-right text-muted-foreground">
            {t(`contact:triage.routing.${triage.notification}`)}
          </span>
        </div>

        {actions}
      </CardContent>
    </Card>
  );
};
