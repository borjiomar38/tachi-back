import dayjs from 'dayjs';
import { ExternalLinkIcon, MailIcon, ReplyIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/tailwind/utils';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ButtonLink } from '@/components/ui/button-link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import type { Outputs } from '@/server/router';

type EmailThreadDetailData = Outputs['emailInbox']['getById'];

interface EmailThreadDetailProps {
  error: boolean;
  item?: EmailThreadDetailData;
  loading: boolean;
  onRetry: () => void;
}

export const EmailThreadDetail = ({
  error,
  item,
  loading,
  onRetry,
}: EmailThreadDetailProps) => {
  const { t } = useTranslation(['emailInbox']);

  if (loading) return <EmailThreadDetailSkeleton />;
  if (error) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <MailIcon className="size-8 opacity-50" />
        <p>{t('emailInbox:detail.error')}</p>
        <Button size="sm" variant="secondary" onClick={onRetry}>
          {t('emailInbox:detail.retry')}
        </Button>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <MailIcon className="size-8 opacity-50" />
        {t('emailInbox:detail.empty')}
      </div>
    );
  }

  const replySubject = item.subject.toLowerCase().startsWith('re:')
    ? item.subject
    : `Re: ${item.subject}`;
  const mailto = `mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(replySubject)}`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b p-4">
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            <AvatarFallback name={item.name} variant="initials" />
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 flex-1 text-base font-semibold">
                {item.subject}
              </h2>
              <Badge variant={getStatusVariant(item.status)} size="sm">
                {t(`emailInbox:status.${item.status}`)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.name} &lt;{item.email}&gt;
            </p>
            <p className="mt-0.5 text-2xs text-muted-foreground">
              {item.mailbox}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button nativeButton={false} render={<a href={mailto} />} size="sm">
            <ReplyIcon />
            {t('emailInbox:detail.reply')}
          </Button>
          <ButtonLink
            params={{ id: item.id }}
            size="sm"
            to="/manager/contacts/$id"
            variant="secondary"
          >
            <ExternalLinkIcon />
            {t('emailInbox:detail.openContact')}
          </ButtonLink>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {item.conversation.map((message) => {
            const outbound = message.direction === 'outbound';
            const sentAt =
              message.sentAt ?? message.receivedAt ?? message.createdAt;
            return (
              <article
                key={message.id}
                className={cn(
                  'max-w-[92%] space-y-3 rounded-lg border p-4',
                  outbound
                    ? 'ml-auto border-positive-500/20 bg-positive-500/5'
                    : 'mr-auto bg-muted/30'
                )}
              >
                <header className="flex flex-wrap items-start gap-x-4 gap-y-1 border-b pb-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate">
                      <span className="text-muted-foreground">
                        {t('emailInbox:detail.from')}:{' '}
                      </span>
                      {message.senderEmail}
                    </p>
                    <p className="truncate">
                      <span className="text-muted-foreground">
                        {t('emailInbox:detail.to')}:{' '}
                      </span>
                      {message.recipientEmail}
                    </p>
                  </div>
                  <time className="shrink-0 text-2xs text-muted-foreground">
                    {dayjs(sentAt).format('DD/MM/YYYY HH:mm')}
                  </time>
                </header>
                <p className="text-sm leading-6 whitespace-pre-wrap">
                  {message.bodyText}
                </p>
                <footer className="flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
                  <Badge size="xs" variant="secondary">
                    {t(
                      outbound
                        ? 'emailInbox:detail.sent'
                        : 'emailInbox:detail.received'
                    )}
                  </Badge>
                  {message.aiGenerated ? (
                    <span>{t('emailInbox:detail.aiReply')}</span>
                  ) : null}
                </footer>
              </article>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

const EmailThreadDetailSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="flex gap-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-40 w-[88%]" />
    <Skeleton className="ml-auto h-44 w-[88%]" />
  </div>
);

const getStatusVariant = (status: EmailThreadDetailData['status']) => {
  if (status === 'unread') return 'warning';
  if (status === 'resolved') return 'positive';
  if (status === 'spam') return 'negative';
  return 'default';
};
