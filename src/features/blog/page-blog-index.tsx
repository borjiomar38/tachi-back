import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import { BlogArticleCard } from '@/features/blog/blog-article-card';
import { BlogDefaultHeroVisual } from '@/features/blog/blog-default-hero-visual';
import {
  BlogArticlePagination,
  BlogArticleSummary,
} from '@/features/blog/schema';
import { androidApkDownload } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

interface PageBlogIndexProps {
  articles: BlogArticleSummary[];
  pagination: BlogArticlePagination;
}

const formatBlogCount = new Intl.NumberFormat('en-US');

export const PageBlogIndex = ({ articles, pagination }: PageBlogIndexProps) => {
  return (
    <PublicShell>
      <section className="relative isolate min-h-[34rem] w-full overflow-hidden border-y border-white/10 bg-neutral-950 text-neutral-50 md:min-h-[38rem]">
        <BlogDefaultHeroVisual />
        <div className="mx-auto flex min-h-[34rem] w-full max-w-6xl items-center px-4 py-10 md:min-h-[38rem] md:py-14">
          <div className="max-w-3xl space-y-5 lg:max-w-[56%]">
            <Badge
              variant="brand"
              size="lg"
              className="border-white/15 bg-white/10 text-neutral-50"
            >
              Manhwa blog
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl leading-tight font-semibold tracking-normal text-balance md:text-6xl">
                Manhwa, manhua, and manga translation guides.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                Practical guides for translating manhwa, manhua, and manga,
                setting up Nayovi, and reading comfortably on Android.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={androidApkDownload.href}
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'bg-brand-300 text-brand-950 hover:bg-brand-200'
                )}
              >
                <span className="flex items-center gap-2">
                  Download Nayovi
                  <DownloadIcon className="size-4" />
                </span>
              </a>
              <a
                href="/pricing"
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'lg' }),
                  'border-white/20 bg-white/10 text-neutral-50 hover:bg-white/15'
                )}
              >
                <span className="flex items-center gap-2">
                  See monthly plans
                  <ArrowRightIcon className="size-4" />
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicSection
        eyebrow="Articles"
        title="Latest Nayovi reading guides"
        description="Fresh reading notes for manhwa, manhua, manga translation, Android setup, and the official Nayovi APK."
        className="pb-20"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <BlogArticleCard key={article.slug} article={article} />
          ))}
        </div>
        <BlogPagination pagination={pagination} />
      </PublicSection>
    </PublicShell>
  );
};

export function BlogPagination(props: {
  basePath?: string;
  pagination: BlogArticlePagination;
}) {
  if (props.pagination.totalPages <= 1) {
    return null;
  }

  const previousPage = Math.max(1, props.pagination.page - 1);
  const nextPage = Math.min(
    props.pagination.totalPages,
    props.pagination.page + 1
  );

  return (
    <nav
      aria-label="Blog pagination"
      className="mt-8 flex flex-col gap-3 rounded-[1.25rem] border border-border/80 bg-card/88 p-4 text-sm text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        Showing {formatBlogCount.format(props.pagination.pageStart)}-
        {formatBlogCount.format(props.pagination.pageEnd)} of{' '}
        {formatBlogCount.format(props.pagination.totalItems)} articles · Page{' '}
        {formatBlogCount.format(props.pagination.page)} of{' '}
        {formatBlogCount.format(props.pagination.totalPages)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <PaginationLink
          disabled={!props.pagination.hasPreviousPage}
          href={buildBlogPageHref(previousPage, props.basePath)}
        >
          <ChevronLeftIcon className="size-4" />
          Previous
        </PaginationLink>
        <PaginationLink
          disabled={!props.pagination.hasNextPage}
          href={buildBlogPageHref(nextPage, props.basePath)}
        >
          Next
          <ChevronRightIcon className="size-4" />
        </PaginationLink>
      </div>
    </nav>
  );
}

function PaginationLink(props: {
  children: ReactNode;
  disabled: boolean;
  href: string;
}) {
  const className = cn(
    buttonVariants({ variant: 'secondary', size: 'sm' }),
    'gap-2'
  );

  if (props.disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          className,
          'cursor-default border-border/60 bg-muted/60 text-muted-foreground opacity-70 shadow-none hover:bg-muted/60 hover:text-muted-foreground'
        )}
      >
        {props.children}
      </span>
    );
  }

  return (
    <a href={props.href} className={className}>
      {props.children}
    </a>
  );
}

function buildBlogPageHref(page: number, basePath = '/blog') {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}
