import dayjs from 'dayjs';
import { LoaderCircleIcon, MailIcon } from 'lucide-react';
import { useEffect, useEffectEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/tailwind/utils';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import type { Outputs } from '@/server/router';

type EmailThread = Outputs['emailInbox']['list']['items'][number];

interface EmailThreadListProps {
  error: boolean;
  filtered: boolean;
  hasNextPage: boolean;
  items: EmailThread[];
  loading: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  onSelect: (id: string) => void;
  selectedId?: string;
  total: number;
}

export const EmailThreadList = ({
  error,
  filtered,
  hasNextPage,
  items,
  loading,
  loadingMore,
  onLoadMore,
  onSelect,
  selectedId,
  total,
}: EmailThreadListProps) => {
  const { t } = useTranslation(['emailInbox']);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const onLoadMoreEvent = useEffectEvent(onLoadMore);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasNextPage || loadingMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMoreEvent();
      },
      { rootMargin: '240px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, loadingMore]);

  if (loading) return <EmailThreadListSkeleton />;
  if (error) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <MailIcon className="size-8 opacity-50" />
        {t('emailInbox:list.error')}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
        <MailIcon className="size-8 opacity-50" />
        {t(filtered ? 'emailInbox:list.emptySearch' : 'emailInbox:list.empty')}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ScrollArea className="min-h-0 flex-1">
        <div className="divide-y">
          {items.map((item) => (
            <button
              key={item.id}
              className={cn(
                'relative flex w-full gap-3 p-3 text-left transition-colors hover:bg-muted/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                selectedId === item.id && 'bg-muted/70'
              )}
              type="button"
              onClick={() => onSelect(item.id)}
            >
              <Avatar size="sm" className="mt-0.5">
                <AvatarFallback name={item.name} variant="initials" />
              </Avatar>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-sm',
                      item.status === 'unread' && 'font-semibold'
                    )}
                  >
                    {item.name || item.email}
                  </span>
                  <span className="shrink-0 text-2xs text-muted-foreground">
                    {dayjs(item.latestMessage.createdAt).fromNow()}
                  </span>
                </div>
                <p
                  className={cn(
                    'truncate text-xs',
                    item.status === 'unread'
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.subject}
                </p>
                <p className="line-clamp-2 text-xs leading-4 text-muted-foreground">
                  {item.latestMessage.bodyText.replaceAll(/\s+/g, ' ').trim()}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge size="xs" variant="secondary" className="max-w-44">
                    <span className="truncate">{item.mailbox}</span>
                  </Badge>
                  {item.status === 'unread' ? (
                    <span className="size-1.5 rounded-full bg-positive-500" />
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
        <div
          ref={loadMoreRef}
          className="flex min-h-10 items-center justify-center p-2.5"
        >
          {loadingMore ? (
            <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
              <LoaderCircleIcon className="size-3 animate-spin" />
              {t('emailInbox:list.loadingMore')}
            </span>
          ) : null}
        </div>
      </ScrollArea>
      <div className="flex min-h-10 items-center border-t p-2.5">
        <span className="text-2xs text-muted-foreground">
          {t('emailInbox:list.showing', { total, visible: items.length })}
        </span>
      </div>
    </div>
  );
};

const EmailThreadListSkeleton = () => (
  <div className="divide-y">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="flex gap-3 p-3">
        <Skeleton className="size-6 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-7 w-full" />
        </div>
      </div>
    ))}
  </div>
);
