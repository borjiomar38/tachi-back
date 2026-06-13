import { getUiState } from '@bearstudio/ui-state';
import { useQuery } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import dayjs from 'dayjs';
import { MessageSquareTextIcon, StarIcon } from 'lucide-react';

import { orpc } from '@/lib/orpc/client';
import type { Outputs } from '@/lib/orpc/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DataList,
  DataListCell,
  DataListEmptyState,
  DataListErrorState,
  DataListLoadingState,
  DataListRow,
  DataListRowResults,
  DataListText,
  DataListTextHeader,
} from '@/components/ui/datalist';
import { SearchButton } from '@/components/ui/search-button';
import { SearchInput } from '@/components/ui/search-input';

import { GuardPermissions } from '@/features/auth/guard-permissions';
import { permissionJob } from '@/features/auth/permissions';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

const ratingFilters = ['all', 'low', '1', '2', '3', '4', '5'] as const;

type RatingFilter = (typeof ratingFilters)[number];

export interface PageTranslationRatingFeedbackProps {
  search: {
    rating?: RatingFilter;
    searchTerm?: string;
  };
}

export const PageTranslationRatingFeedback = (
  props: PageTranslationRatingFeedbackProps
) => {
  const router = useRouter();
  const rating = props.search.rating ?? 'all';
  const searchTerm = props.search.searchTerm ?? '';
  const normalizedSearchTerm = searchTerm.trim();
  const feedbackQuery = useQuery(
    orpc.translationRatingFeedback.list.queryOptions({
      input: {
        limit: 50,
        rating,
        searchTerm: normalizedSearchTerm,
      },
    })
  );
  const searchInputProps = {
    onChange: (value: string) =>
      router.navigate({
        replace: true,
        search: {
          rating,
          searchTerm: value,
        },
        to: '.',
      }),
    value: searchTerm,
  };
  const ui = getUiState((set) => {
    if (feedbackQuery.status === 'pending') {
      return set('pending');
    }

    if (feedbackQuery.status === 'error') {
      return set('error');
    }

    if (!feedbackQuery.data.items.length) {
      return set('empty');
    }

    return set('default', {
      items: feedbackQuery.data.items,
      stats: feedbackQuery.data.stats,
      total: feedbackQuery.data.total,
    });
  });

  return (
    <GuardPermissions permissions={[permissionJob.read]}>
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Translation Feedback</PageLayoutTopBarTitle>
          <SearchButton
            {...searchInputProps}
            className="-mx-2 md:hidden"
            size="icon-sm"
          />
          <SearchInput
            {...searchInputProps}
            className="max-w-sm max-md:hidden"
            placeholder="Search title, chapter, comment, license"
            size="sm"
          />
        </PageLayoutTopBar>
        <PageLayoutContent containerClassName="max-w-7xl">
          <div className="space-y-4">
            <RatingFilterBar
              rating={rating}
              onChange={(nextRating) =>
                router.navigate({
                  replace: true,
                  search: {
                    rating: nextRating,
                    searchTerm,
                  },
                  to: '.',
                })
              }
            />

            {ui
              .match('pending', () => (
                <DataList>
                  <DataListLoadingState />
                </DataList>
              ))
              .match('error', () => (
                <DataList>
                  <DataListErrorState retry={() => feedbackQuery.refetch()} />
                </DataList>
              ))
              .match('empty', () => (
                <DataList>
                  <DataListEmptyState>
                    No translation feedback matches the current filters.
                  </DataListEmptyState>
                </DataList>
              ))
              .match('default', ({ items, stats, total }) => (
                <div className="space-y-4">
                  <FeedbackSummary stats={stats} visibleCount={items.length} />
                  <FeedbackList items={items} total={total} />
                </div>
              ))
              .exhaustive()}
          </div>
        </PageLayoutContent>
      </PageLayout>
    </GuardPermissions>
  );
};

interface RatingFilterBarProps {
  onChange: (rating: RatingFilter) => void;
  rating: RatingFilter;
}

const RatingFilterBar = (props: RatingFilterBarProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {ratingFilters.map((rating) => (
        <Button
          key={rating}
          size="xs"
          variant={props.rating === rating ? 'default' : 'secondary'}
          onClick={() => props.onChange(rating)}
        >
          {humanizeRatingFilter(rating)}
        </Button>
      ))}
    </div>
  );
};

interface FeedbackSummaryProps {
  stats: {
    averageRating: number | null;
    commentCount: number;
    lowRatingCount: number;
    total: number;
  };
  visibleCount: number;
}

const FeedbackSummary = (props: FeedbackSummaryProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <SummaryCard
        label="Feedback"
        subLabel={`${props.visibleCount}/${props.stats.total} visible records`}
        value={props.stats.total.toString()}
      />
      <SummaryCard
        label="Average"
        subLabel="Across the current filter"
        value={
          props.stats.averageRating === null
            ? 'n/a'
            : props.stats.averageRating.toFixed(2)
        }
      />
      <SummaryCard
        label="Low Ratings"
        subLabel="One or two stars"
        value={props.stats.lowRatingCount.toString()}
      />
      <SummaryCard
        label="Comments"
        subLabel="Free-text feedback"
        value={props.stats.commentCount.toString()}
      />
    </div>
  );
};

interface SummaryCardProps {
  label: string;
  subLabel: string;
  value: string;
}

const SummaryCard = (props: SummaryCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="text-xl">{props.value}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">
        {props.subLabel}
      </CardContent>
    </Card>
  );
};

interface FeedbackListProps {
  items: FeedbackListItem[];
  total: number;
}

type FeedbackListItem =
  Outputs['translationRatingFeedback']['list']['items'][number];

const FeedbackList = (props: FeedbackListProps) => {
  return (
    <DataList>
      <DataListRowResults>
        Translation feedback ({props.items.length}/{props.total})
      </DataListRowResults>
      {props.items.map((item) => (
        <DataListRow key={item.id} withHover>
          <DataListCell className="flex-[1.6]">
            <DataListText className="font-medium">
              {item.chapterCacheKey ? (
                <Link
                  params={{
                    cacheKey: item.chapterCacheKey,
                  }}
                  to="/manager/chapters/$cacheKey"
                >
                  {getFeedbackTitle(item)}
                  <span className="absolute inset-0" />
                </Link>
              ) : (
                getFeedbackTitle(item)
              )}
            </DataListText>
            <DataListText className="text-xs text-muted-foreground">
              {getFeedbackSubtitle(item)}
            </DataListText>
            {item.comment ? (
              <div className="mt-2 flex max-w-full gap-2 rounded-sm bg-muted px-2 py-1.5 text-xs text-muted-foreground">
                <MessageSquareTextIcon className="mt-0.5 size-3 shrink-0" />
                <span className="line-clamp-2 min-w-0 whitespace-normal">
                  {item.comment}
                </span>
              </div>
            ) : null}
          </DataListCell>
          <DataListCell className="flex-[0.45]">
            <DataListTextHeader>Rating</DataListTextHeader>
            <RatingBadge rating={item.rating} />
          </DataListCell>
          <DataListCell className="flex-[0.7] max-md:hidden">
            <DataListTextHeader>User</DataListTextHeader>
            <DataListText className="text-xs">
              {item.ownerEmail ?? item.licenseKey}
            </DataListText>
            <DataListText className="text-xs text-muted-foreground">
              {item.installationId}
            </DataListText>
          </DataListCell>
          <DataListCell className="flex-[0.55] max-lg:hidden">
            <DataListTextHeader>Session</DataListTextHeader>
            <DataListText className="text-xs">
              {formatReadDuration(item.readDurationMs)}
            </DataListText>
            <DataListText className="text-xs text-muted-foreground">
              {item.pageCount ? `${item.pageCount} pages` : 'unknown pages'}
            </DataListText>
          </DataListCell>
          <DataListCell className="flex-[0.65] max-xl:hidden">
            <DataListTextHeader>App</DataListTextHeader>
            <DataListText className="text-xs">
              {formatAppVersion(item)}
            </DataListText>
            <DataListText className="text-xs text-muted-foreground">
              {dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
            </DataListText>
          </DataListCell>
        </DataListRow>
      ))}
    </DataList>
  );
};

interface RatingBadgeProps {
  rating: number;
}

const RatingBadge = (props: RatingBadgeProps) => {
  return (
    <Badge variant={props.rating <= 2 ? 'negative' : 'secondary'}>
      <StarIcon className="fill-current" />
      {props.rating}/5
    </Badge>
  );
};

function humanizeRatingFilter(rating: RatingFilter) {
  const labels: Record<RatingFilter, string> = {
    '1': '1 star',
    '2': '2 stars',
    '3': '3 stars',
    '4': '4 stars',
    '5': '5 stars',
    all: 'All',
    low: 'Low',
  };

  return labels[rating];
}

function getFeedbackTitle(item: FeedbackListItem) {
  return item.mangaTitle ?? item.translationJobId ?? item.id;
}

function getFeedbackSubtitle(item: FeedbackListItem) {
  return [
    item.chapterName ?? item.chapterUrl ?? 'Unknown chapter',
    item.sourceName ?? 'Unknown source',
    `${item.sourceLanguage ?? 'auto'} -> ${item.targetLanguage}`,
  ].join(' · ');
}

function formatReadDuration(durationMs?: number | null) {
  if (!durationMs) {
    return 'unknown read time';
  }

  const minutes = Math.max(Math.round(durationMs / 60_000), 1);

  return `${minutes} min read`;
}

function formatAppVersion(item: {
  appBuild?: string | null;
  appVersion?: string | null;
  locale?: string | null;
}) {
  return [
    item.appVersion ?? 'unknown app',
    item.appBuild ? `build ${item.appBuild}` : null,
    item.locale,
  ]
    .filter(Boolean)
    .join(' · ');
}
