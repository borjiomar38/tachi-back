import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import heroBackground from '@/features/auth/layout-login-background.webp';
import heroCharacter from '@/features/auth/layout-login-character.webp';
import { BlogArticleCard } from '@/features/blog/blog-article-card';
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
      <section className="mx-auto w-full max-w-6xl px-4 pt-7 md:pt-10">
        <div className="public-ink-panel relative isolate overflow-hidden rounded-[1.75rem] border px-5 py-8 text-neutral-50 md:px-8 md:py-10">
          <img
            src={heroBackground}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover object-[62%_center] opacity-42"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral-950 via-neutral-950/88 to-neutral-950/45" />
          <img
            src={heroCharacter}
            alt=""
            className="animate-float-in-space pointer-events-none absolute right-[-5rem] bottom-[-7rem] hidden w-[min(26rem,42%)] opacity-92 drop-shadow-[0_30px_56px_rgba(0,0,0,0.55)] md:block"
          />
          <div className="max-w-3xl space-y-5">
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
                Search-friendly articles about reading workflows, hosted OCR,
                translation quality, and the official Nayovi Android download.
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
                href="/download"
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'lg' }),
                  'border-white/20 bg-white/10 text-neutral-50 hover:bg-white/15'
                )}
              >
                Install guide
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

function BlogPagination(props: { pagination: BlogArticlePagination }) {
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
          href={buildBlogPageHref(previousPage)}
        >
          <ChevronLeftIcon className="size-4" />
          Previous
        </PaginationLink>
        <PaginationLink
          disabled={!props.pagination.hasNextPage}
          href={buildBlogPageHref(nextPage)}
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

function buildBlogPageHref(page: number) {
  return page <= 1 ? '/blog' : `/blog?page=${page}`;
}
