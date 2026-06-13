import {
  ArrowRightIcon,
  BookOpenTextIcon,
  CalendarDaysIcon,
  ClockIcon,
  LockIcon,
  SparklesIcon,
} from 'lucide-react';

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
  const publicChapters = series.chapters.filter(isManhwaChapterPublic);
  const latestChapter = publicChapters.at(-1);

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
            <div className="grid gap-8 md:grid-cols-[1fr_19rem] md:items-center lg:grid-cols-[1fr_22rem]">
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
                <div className="grid max-w-2xl gap-3 sm:grid-cols-3">
                  <SeriesFact
                    icon={BookOpenTextIcon}
                    label="Live chapters"
                    value={publicChapters.length.toString()}
                  />
                  <SeriesFact
                    icon={SparklesIcon}
                    label="Planned"
                    value={`${series.totalPlannedChapters}`}
                  />
                  <SeriesFact
                    icon={ClockIcon}
                    label="Chapter time"
                    value={
                      latestChapter
                        ? `${latestChapter.readingMinutes} min`
                        : 'Soon'
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  {latestChapter ? (
                    <a
                      href={`/manhwa/${series.slug}/chapter/${latestChapter.chapterNumber}`}
                      className={cn(
                        buttonVariants({ variant: 'default', size: 'lg' }),
                        'bg-brand-300 text-brand-950 hover:bg-brand-200'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        Read chapter {latestChapter.chapterNumber}
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

              <div className="relative mx-auto w-full max-w-[18rem] md:max-w-none">
                <div className="absolute -inset-3 rounded-[1.5rem] bg-brand-300/20 blur-2xl" />
                <img
                  src={series.coverImagePath ?? heroBackground}
                  alt={series.coverAlt}
                  className="relative aspect-[3/4] w-full rounded-[1.25rem] border border-white/15 object-cover shadow-2xl shadow-black/50"
                />
              </div>
            </div>
          </div>
        </section>

        <PublicSection
          eyebrow="Series info"
          title="A royal regression fantasy built as a Nayovi Original"
          description={
            latestChapter
              ? `The Eclipse Crown starts with a condemned princess, a living relic, and a duke who remembers the first timeline too late. Chapter ${latestChapter.chapterNumber} is now available in the vertical webtoon reader.`
              : 'The Eclipse Crown starts with a condemned princess, a living relic, and a duke who remembers the first timeline too late.'
          }
          className="pb-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <InfoPanel
              label="Latest chapter"
              value={
                latestChapter
                  ? `Chapter ${latestChapter.chapterNumber}: ${latestChapter.title}`
                  : 'Coming soon'
              }
            />
            <InfoPanel
              label="Release status"
              value={
                latestChapter
                  ? `Chapter ${latestChapter.chapterNumber} live`
                  : 'In production'
              }
            />
            <InfoPanel
              label="Updated"
              value={latestChapter?.updatedAt ?? series.lastModified}
            />
          </div>
        </PublicSection>

        <PublicSection
          eyebrow="Chapters"
          title="Chapter list"
          description="Read the published chapters online. New chapters will appear here when the production review marks them ready."
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
                  Read chapter
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

function SeriesFact(props: {
  icon: typeof BookOpenTextIcon;
  label: string;
  value: string;
}) {
  const Icon = props.icon;

  return (
    <div className="rounded-xl border border-white/10 bg-white/8 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-300">
        <Icon className="size-4 text-brand-200" />
        {props.label}
      </div>
      <div className="mt-1 text-lg font-semibold text-neutral-50">
        {props.value}
      </div>
    </div>
  );
}

function InfoPanel(props: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-border/80 bg-card/88 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDaysIcon className="size-4" />
        {props.label}
      </div>
      <div className="mt-2 text-lg font-semibold tracking-normal">
        {props.value}
      </div>
    </div>
  );
}
