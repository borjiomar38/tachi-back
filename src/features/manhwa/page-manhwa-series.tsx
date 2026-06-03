import {
  ArrowRightIcon,
  BookOpenTextIcon,
  CalendarDaysIcon,
  LockIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import heroBackground from '@/features/auth/layout-login-background.webp';
import { isManhwaChapterPublic } from '@/features/manhwa/data';
import { ManhwaCharacter, ManhwaSeries } from '@/features/manhwa/schema';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

interface PageManhwaSeriesProps {
  series: ManhwaSeries;
}

export const PageManhwaSeries = ({ series }: PageManhwaSeriesProps) => {
  const firstChapter = series.chapters[0];
  const publicChapterCount = series.chapters.filter(
    isManhwaChapterPublic
  ).length;

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
          title="Story plan"
          description={series.audienceNote}
          className="pb-8"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={BookOpenTextIcon}
              label="Planned chapters"
              value={String(series.totalPlannedChapters)}
            />
            <MetricCard
              icon={CalendarDaysIcon}
              label="Published chapters"
              value={String(publicChapterCount)}
            />
            <MetricCard
              icon={ShieldCheckIcon}
              label="Validation"
              value="AI expert"
            />
          </div>
        </PublicSection>

        <PublicSection
          eyebrow="Seasons"
          title="The 120-chapter arc"
          description="The story is split into four production arcs so the nightly agent can generate one chapter at a time without losing the long-term plot."
          className="pt-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            {series.seasons.map((season) => (
              <Card key={season.seasonNumber} className="rounded-[1.5rem]">
                <CardContent className="grid gap-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="brand" size="sm">
                      Season {season.seasonNumber}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Chapters {season.chapterStart}-{season.chapterEnd}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold tracking-normal">
                    {season.title}
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {season.description}
                  </p>
                  <p className="text-sm leading-6 text-foreground">
                    {season.arc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </PublicSection>

        <PublicSection
          eyebrow="Characters"
          title="Character registry"
          description="Every recurring character keeps a canonical prompt and reference slot so future chapters do not redraw a different face or body."
          className="pt-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {series.characters.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
        </PublicSection>

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

function MetricCard(props: {
  icon: typeof BookOpenTextIcon;
  label: string;
  value: string;
}) {
  const Icon = props.icon;

  return (
    <Card className="rounded-[1.5rem]">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="size-5" />
        </span>
        <span>
          <span className="block text-sm text-muted-foreground">
            {props.label}
          </span>
          <span className="block text-2xl font-semibold tracking-normal">
            {props.value}
          </span>
        </span>
      </CardContent>
    </Card>
  );
}

function CharacterCard(props: { character: ManhwaCharacter }) {
  return (
    <Card className="overflow-hidden rounded-[1.5rem]">
      <div className="aspect-[4/5] bg-neutral-950">
        {props.character.imagePath ? (
          <img
            src={props.character.imagePath}
            alt={props.character.name}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-[radial-gradient(circle_at_50%_28%,oklch(0.42_0.13_293),transparent_18rem),linear-gradient(155deg,oklch(0.16_0.02_293),oklch(0.08_0.01_260))] p-6 text-center text-neutral-200">
            <UsersIcon className="size-10 opacity-80" />
          </div>
        )}
      </div>
      <CardContent className="grid gap-3 p-5">
        <div>
          <h2 className="text-xl font-semibold tracking-normal">
            {props.character.name}
          </h2>
          <p className="text-sm text-primary">{props.character.role}</p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {props.character.description}
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <SparklesIcon className="size-4 text-primary" />
          {props.character.accent}
        </div>
      </CardContent>
    </Card>
  );
}
