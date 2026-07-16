import type { Meta } from '@storybook/react-vite';
import { RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { ContactTriageAutomationCard } from '@/features/contact/manager/contact-triage-automation-card';
import { ContactTriageBadge } from '@/features/contact/manager/contact-triage-badge';
import { ContactTriageCard } from '@/features/contact/manager/contact-triage-card';
import type { ContactTriageView } from '@/server/contact/schema';

export default {
  parameters: { layout: 'fullscreen' },
  title: 'Contact/Automatic triage',
} satisfies Meta;

const maliciousTriage = {
  analyzedAt: new Date('2026-07-16T10:26:44.209Z'),
  attempts: 3,
  classification: 'malicious',
  error: null,
  notification: 'suppressed',
  notifiedAt: null,
  reason:
    'Unsolicited investment request using vague claims and a separate free-email address.',
  state: 'filtered',
  tags: ['spam', 'scam'],
} satisfies ContactTriageView;

const actionableTriage = {
  analyzedAt: new Date('2026-07-16T11:02:00.000Z'),
  attempts: 1,
  classification: 'actionable',
  error: null,
  notification: 'replied',
  notifiedAt: null,
  reason: 'A legitimate reader asking how to choose and buy a Nayovi plan.',
  repliedAt: new Date('2026-07-16T11:02:05.000Z'),
  replyIntent: 'pricing',
  replySubject: 'Re: Which Nayovi plan should I choose?',
  state: 'replied',
  tags: [],
} satisfies ContactTriageView;

const awaitingTriage = {
  analyzedAt: null,
  attempts: 0,
  classification: null,
  error: null,
  notification: 'pending',
  notifiedAt: null,
  reason: null,
  state: 'processing',
  tags: [],
} satisfies ContactTriageView;

export const InboxAndDetail = () => {
  const { t } = useTranslation(['contact']);

  return (
    <div className="dark min-h-screen bg-background p-8 text-foreground">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <ContactTriageAutomationCard
            analyzed={98}
            failed={0}
            lastAnalyzedAt={new Date(Date.now() - 60_000)}
            loading={false}
            onRetryFailed={() => undefined}
            total={98}
          />
          <Card>
            <CardContent className="divide-y divide-border p-0">
              <PreviewRow
                email="halitaandrew160@gmail.com"
                subject="Aloha writing about price for reseller"
                triage={actionableTriage}
              />
              <PreviewRow
                email="taurusfinv2@gmail.com"
                subject="Investment Partnership"
                triage={maliciousTriage}
              />
              <PreviewRow
                email="jaylan.conley@gmail.com"
                subject="Free SEO Audit for tachiyomiat.com"
                triage={awaitingTriage}
              />
            </CardContent>
          </Card>
        </div>
        <ContactTriageCard
          actions={
            <Button className="w-full" variant="secondary">
              <RefreshCwIcon />
              {t('contact:triage.analyzeAgain')}
            </Button>
          }
          triage={actionableTriage}
        />
      </div>
    </div>
  );
};

interface PreviewRowProps {
  email: string;
  subject: string;
  triage: ContactTriageView;
}

const PreviewRow = ({ email, subject, triage }: PreviewRowProps) => (
  <div className="flex items-center justify-between gap-4 px-4 py-4">
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">{subject}</div>
      <div className="truncate text-xs text-muted-foreground">{email}</div>
    </div>
    <ContactTriageBadge triage={triage} />
  </div>
);
