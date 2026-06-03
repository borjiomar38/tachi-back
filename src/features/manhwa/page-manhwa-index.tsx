import {
  ArrowRightIcon,
  BookOpenTextIcon,
  CrownIcon,
  ShieldCheckIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import heroBackground from '@/features/auth/layout-login-background.webp';
import heroCharacter from '@/features/auth/layout-login-character.webp';
import { isManhwaChapterPublic } from '@/features/manhwa/data';
import { ManhwaSeries } from '@/features/manhwa/schema';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

interface PageManhwaIndexProps {
  series: ManhwaSeries[];
}

export const PageManhwaIndex = ({ series }: PageManhwaIndexProps) => {
  const featuredSeries = series[0];

  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-7 md:pt-10">
        <div className="public-ink-panel relative isolate min-h-[34rem] overflow-hidden rounded-[1.75rem] border px-5 py-8 text-neutral-50 md:min-h-[36rem] md:px-8 md:py-10">
          <img
            src={featuredSeries?.coverImagePath ?? heroBackground}
            alt={featuredSeries?.coverImagePath ? featuredSeries.coverAlt : ''}
            className="absolute inset-0 -z-20 size-full object-cover object-[62%_center] opacity-45"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral-950 via-neutral-950/88 to-neutral-950/36" />
          {featuredSeries?.coverImagePath ? null : (
            <img
              src={heroCharacter}
              alt=""
              className="animate-float-in-space pointer-events-none absolute right-[-5rem] bottom-[-7rem] hidden w-[min(27rem,42%)] opacity-86 drop-shadow-[0_30px_56px_rgba(0,0,0,0.55)] md:block"
            />
          )}
          <div className="max-w-3xl space-y-5">
            <Badge
              variant="brand"
              size="lg"
              className="border-white/15 bg-white/10 text-neutral-50"
            >
              Nayovi Originals
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl leading-tight font-semibold tracking-normal text-balance md:text-6xl">
                Original manhwa built for vertical reading.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                Read original Nayovi stories online, then continue through the
                Android reader workflow when new chapters arrive.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {featuredSeries ? (
                <a
                  href={`/manhwa/${featuredSeries.slug}`}
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'lg' }),
                    'bg-brand-300 text-brand-950 hover:bg-brand-200'
                  )}
                >
                  <span className="flex items-center gap-2">
                    Start {featuredSeries.title}
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
        eyebrow="Series"
        title="Nayovi original manhwa"
        description="Each project keeps a story bible, character registry, chapter manifest, and AI expert continuity review before publication."
        className="pb-20"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {series.map((item) => (
            <SeriesCard key={item.slug} series={item} />
          ))}
        </div>
      </PublicSection>
    </PublicShell>
  );
};

function SeriesCard(props: { series: ManhwaSeries }) {
  const firstChapter = props.series.chapters[0];
  const publicChapterCount = props.series.chapters.filter(
    isManhwaChapterPublic
  ).length;
  const privateChapterCount = props.series.chapters.length - publicChapterCount;

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-border/80 bg-card shadow-sm">
      <a
        href={`/manhwa/${props.series.slug}`}
        className="group grid h-full grid-rows-[auto_1fr]"
      >
        <div className="relative aspect-[16/9] overflow-hidden bg-neutral-950">
          <img
            src={props.series.coverImagePath ?? heroBackground}
            alt={props.series.coverImagePath ? props.series.coverAlt : ''}
            className="size-full object-cover opacity-72 transition duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/20 to-transparent" />
          <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
            {props.series.genres.slice(0, 3).map((genre) => (
              <Badge
                key={genre}
                variant="secondary"
                size="sm"
                className="border-white/15 bg-white/10 text-neutral-50"
              >
                {genre}
              </Badge>
            ))}
          </div>
        </div>
        <div className="grid gap-5 p-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CrownIcon className="size-4" />
                {props.series.totalPlannedChapters} planned chapters
              </span>
              <span className="inline-flex items-center gap-1">
                <BookOpenTextIcon className="size-4" />
                {publicChapterCount} live
                {privateChapterCount > 0
                  ? `, ${privateChapterCount} private`
                  : ''}
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-normal">
                {props.series.title}
              </h2>
              <p className="text-sm font-medium text-primary">
                {props.series.tagline}
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                {props.series.description}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheckIcon className="size-4 text-primary" />
              Expert AI continuity review
            </span>
            {firstChapter ? (
              <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                Read chapter {firstChapter.chapterNumber}
                <ArrowRightIcon className="size-4" />
              </span>
            ) : null}
          </div>
        </div>
      </a>
    </article>
  );
}
