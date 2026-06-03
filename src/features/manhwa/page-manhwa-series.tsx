import { ArrowRightIcon, LockIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import heroBackground from '@/features/auth/layout-login-background.webp';
import { ManhwaSeriesView } from '@/features/manhwa/schema';
import { isManhwaChapterPublic } from '@/features/manhwa/visibility';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

interface PageManhwaSeriesProps {
  series: ManhwaSeriesView;
}

export const PageManhwaSeries = ({ series }: PageManhwaSeriesProps) => {
  const firstChapter = series.chapters[0];

  return (
    <PublicShell>
      <article>
        <section className="mx-auto w-full max-w-6xl px-4 pt-7 md:pt-10">
          <div className="public-ink-panel relative isolate overflow-hidden rounded-[1.75rem] border px-5 py-8 text-neutral-50 md:px-8 md:py-10">
            <img
              src={series.coverImagePath ?? heroBackground}
              alt={series.coverImagePath ? series.coverAlt : ''}
              className="absolute inset-0 -z-20 size-full object-cover object-[60%_center] opacity-55"
            />
            <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral-950 via-neutral-950/84 to-neutral-950/25" />
            <div className="max-w-3xl space-y-5">
              <a
                href="/manhwa"
                className="inline-flex items-center gap-2 text-sm text-neutral-300 transition hover:text-neutral-50"
              >
                Nayovi Originals
              </a>
              <div className="flex flex-wrap gap-2">
                {series.genres.map((genre) => (
                  <Badge
                    key={genre}
                    variant="brand"
                    size="lg"
                    className="border-white/15 bg-white/10 text-neutral-50"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl leading-tight font-semibold tracking-normal text-balance md:text-6xl">
                  {series.title}
                </h1>
                <p className="max-w-xl text-xl leading-8 text-brand-100">
                  {series.tagline}
                </p>
                <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                  {series.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {firstChapter ? (
                  <a
                    href={`/manhwa/${series.slug}/chapter/${firstChapter.chapterNumber}`}
                    className={cn(
                      buttonVariants({ variant: 'default', size: 'lg' }),
                      'bg-brand-300 text-brand-950 hover:bg-brand-200'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      Read chapter {firstChapter.chapterNumber}
                      <ArrowRightIcon className="size-4" />
                    </span>
                  </a>
                ) : null}
                <a
                  href="/download"
                  className={cn(
                    buttonVariants({ variant: 'secondary', size: 'lg' }),
                    'border-white/20 bg-white/10 text-neutral-50 hover:bg-white/15'
                  )}
                >
                  Nayovi Android
                </a>
              </div>
            </div>
          </div>
        </section>

        <PublicSection
          eyebrow="Chapters"
          title="Start reading"
          description="Chapter pages use vertical manhwa panels, story text, and navigation that can grow as the nightly production agent publishes more chapters."
          className="pt-4 pb-20"
        >
          <div className="grid gap-3">
            {series.chapters.map((chapter) => (
              <a
                key={chapter.chapterNumber}
                href={`/manhwa/${series.slug}/chapter/${chapter.chapterNumber}`}
                className="group grid gap-3 rounded-[1.25rem] border border-border/80 bg-card/88 p-4 shadow-sm transition hover:border-primary/50 md:grid-cols-[auto_1fr_auto] md:items-center"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
                  {chapter.chapterNumber}
                </span>
                <span className="space-y-1">
                  <span className="block font-semibold tracking-normal">
                    {chapter.title}
                  </span>
                  {!isManhwaChapterPublic(chapter) ? (
                    <Badge variant="secondary" size="sm" className="w-fit">
                      <LockIcon className="size-3" />
                      Private progress
                    </Badge>
                  ) : null}
                  <span className="block text-sm leading-6 text-muted-foreground">
                    {chapter.excerpt}
                  </span>
                </span>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary">
                  Read
                  <ArrowRightIcon className="size-4 transition group-hover:translate-x-0.5" />
                </span>
              </a>
            ))}
          </div>
        </PublicSection>
      </article>
    </PublicShell>
  );
};
