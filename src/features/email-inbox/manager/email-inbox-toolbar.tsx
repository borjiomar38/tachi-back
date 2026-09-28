import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/tailwind/utils';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { EmailInboxFilter } from '@/server/email-inbox/policy';

import type { EmailInboxLiveState } from './use-email-inbox-store';

const FILTERS = ['all', 'unread', 'read', 'replied'] as const;

interface EmailInboxToolbarProps {
  filter: EmailInboxFilter;
  liveState: EmailInboxLiveState;
  mailbox: string;
  mailboxes: string[];
  onFilterChange: (filter: EmailInboxFilter) => void;
  onMailboxChange: (mailbox: string) => void;
}

export const EmailInboxToolbar = ({
  filter,
  liveState,
  mailbox,
  mailboxes,
  onFilterChange,
  onMailboxChange,
}: EmailInboxToolbarProps) => {
  const { t } = useTranslation(['emailInbox']);
  const liveLabel = t(`emailInbox:live.${liveState}`);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-sm border bg-card p-2">
      <div className="flex min-w-0 flex-1 flex-wrap gap-1">
        {FILTERS.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'secondary' : 'ghost'}
            onClick={() => onFilterChange(value)}
          >
            {t(`emailInbox:filters.${value}`)}
          </Button>
        ))}
      </div>
      <Select
        items={[
          { label: t('emailInbox:allMailboxes'), value: 'all' },
          ...mailboxes.map((value) => ({ label: value, value })),
        ]}
        value={mailbox}
        onValueChange={(value) => onMailboxChange(value ?? 'all')}
      >
        <SelectTrigger size="sm" className="w-60 max-w-full">
          <SelectValue placeholder={t('emailInbox:allMailboxes')} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">{t('emailInbox:allMailboxes')}</SelectItem>
            {mailboxes.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <div className="flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs text-muted-foreground">
        <span
          className={cn(
            'size-2 rounded-full',
            liveState === 'live' || liveState === 'databaseOnly'
              ? 'bg-positive-500 shadow-[0_0_0_3px_rgb(34_197_94/0.12)]'
              : 'animate-pulse bg-warning-500'
          )}
        />
        {liveLabel}
      </div>
    </div>
  );
};
