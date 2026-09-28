import {
  AtSignIcon,
  MailCheckIcon,
  MailIcon,
  MailOpenIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { Outputs } from '@/server/router';

type EmailInboxSummaryData = Outputs['emailInbox']['list']['summary'];

interface EmailInboxSummaryProps {
  summary?: EmailInboxSummaryData;
}

export const EmailInboxSummary = ({ summary }: EmailInboxSummaryProps) => {
  const { t } = useTranslation(['emailInbox']);
  const cards = [
    {
      description: t('emailInbox:summary.totalDescription'),
      icon: MailIcon,
      label: t('emailInbox:summary.total'),
      value: summary?.total ?? 0,
    },
    {
      description: t('emailInbox:summary.unreadDescription'),
      icon: MailOpenIcon,
      label: t('emailInbox:summary.unread'),
      value: summary?.unread ?? 0,
    },
    {
      description: t('emailInbox:summary.repliedDescription'),
      icon: MailCheckIcon,
      label: t('emailInbox:summary.replied'),
      value: summary?.replied ?? 0,
    },
    {
      description: t('emailInbox:summary.mailboxesDescription'),
      icon: AtSignIcon,
      label: t('emailInbox:summary.mailboxes'),
      value: summary?.mailboxes ?? 0,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="gap-3 py-3">
          <CardHeader className="grid grid-cols-[1fr_auto] gap-2 px-3">
            <div className="space-y-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <CardDescription className="line-clamp-1 text-xs">
                {card.description}
              </CardDescription>
            </div>
            <card.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3">
            <div className="text-2xl font-semibold tracking-tight">
              {card.value.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
