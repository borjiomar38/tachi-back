import {
  ArrowLeftIcon,
  BookOpenTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import {
  ManhwaChapterView,
  ManhwaPanelView,
  ManhwaSeriesView,
} from '@/features/manhwa/schema';
import { isManhwaChapterPublic } from '@/features/manhwa/visibility';
import { PublicShell } from '@/features/public/public-shell';

interface PageManhwaChapterProps {
  chapter: ManhwaChapterView;
  nextChapter?: ManhwaChapterView;
  previousChapter?: ManhwaChapterView;
  series: ManhwaSeriesView;
}

export const PageManhwaChapter = ({
  chapter,
  nextChapter,
  previousChapter,
  series,
}: PageManhwaChapterProps) => {
  return (
    <PublicShell>
      <article className="bg-neutral-950 text-neutral-50">
        <header className="sticky top-[89px] z-10 border-y border-white/10 bg-neutral-950/92 backdrop-blur md:top-[81px]">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 space-y-1">
              <a
                href={`/manhwa/${series.slug}`}
                className="inline-flex items-center gap-2 text-sm text-neutral-300 transition hover:text-neutral-50"
              >
                <ArrowLeftIcon className="size-4" />
                {series.title}
              </a>
              <h1 className="truncate text-xl font-semibold tracking-normal md:text-2xl">
                Chapter {chapter.chapterNumber}: {chapter.title}
              </h1>
            </div>
            <ChapterNav
              nextChapter={nextChapter}
              previousChapter={previousChapter}
              series={series}
            />
          </div>
        </header>

        <section className="mx-auto w-full max-w-5xl px-4 py-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="brand"
                  size="sm"
                  className="border-white/10 bg-white/10 text-neutral-50"
                >
                  Season {chapter.seasonNumber}
                </Badge>
                <Badge
                  variant="secondary"
                  size="sm"
                  className="border-white/10 bg-white/10 text-neutral-50"
                >
                  {chapter.readingMinutes} min read
                </Badge>
                {!isManhwaChapterPublic(chapter) ? (
                  <Badge
                    variant="secondary"
                    size="sm"
                    className="border-white/10 bg-white/10 text-neutral-50"
                  >
                    Private progress
                  </Badge>
                ) : null}
              </div>
              <p className="max-w-3xl text-base leading-7 text-neutral-300">
                {chapter.excerpt}
              </p>
            </div>
            <a
              href="/download"
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'sm' }),
                'border-white/15 bg-white/10 text-neutral-50 hover:bg-white/15'
              )}
            >
              Nayovi Android
            </a>
          </div>
        </section>

        <section
          aria-label={`${series.title} chapter ${chapter.chapterNumber} panels`}
          className="mx-auto w-full max-w-[760px] px-0 pb-10 md:px-4"
        >
          <div className="overflow-hidden bg-black shadow-2xl shadow-black/40 md:rounded-[1.25rem] md:border md:border-white/10">
            {chapter.panels.map((panel, index) => (
              <ReaderPanel
                key={panel.id}
                panel={panel}
                panelNumber={index + 1}
              />
            ))}
          </div>
        </section>

        <footer className="mx-auto grid w-full max-w-5xl gap-4 px-4 pb-14 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <ChapterLink
            chapter={previousChapter}
            direction="previous"
            series={series}
          />
          <a
            href={`/manhwa/${series.slug}`}
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'lg' }),
              'justify-center border-white/15 bg-white/10 text-neutral-50 hover:bg-white/15'
            )}
          >
            <span className="flex items-center gap-2">
              <BookOpenTextIcon className="size-4" />
              Series page
            </span>
          </a>
          <ChapterLink chapter={nextChapter} direction="next" series={series} />
        </footer>
      </article>
    </PublicShell>
  );
};

function ChapterNav(props: {
  nextChapter?: ManhwaChapterView;
  previousChapter?: ManhwaChapterView;
  series: ManhwaSeriesView;
}) {
  return (
    <nav aria-label="Chapter navigation" className="flex items-center gap-2">
      <CompactChapterLink
        chapter={props.previousChapter}
        direction="previous"
        series={props.series}
      />
      <CompactChapterLink
        chapter={props.nextChapter}
        direction="next"
        series={props.series}
      />
    </nav>
  );
}

function CompactChapterLink(props: {
  chapter?: ManhwaChapterView;
  direction: 'next' | 'previous';
  series: ManhwaSeriesView;
}) {
  const label = props.direction === 'previous' ? 'Previous' : 'Next';
  const Icon =
    props.direction === 'previous' ? ChevronLeftIcon : ChevronRightIcon;
  const className = cn(
    buttonVariants({ variant: 'secondary', size: 'sm' }),
    'border-white/15 bg-white/10 text-neutral-50 hover:bg-white/15'
  );

  if (!props.chapter) {
    return (
      <span aria-disabled="true" className={cn(className, 'opacity-45')}>
        <Icon className="size-4" />
        {label}
      </span>
    );
  }

  return (
    <a
      href={`/manhwa/${props.series.slug}/chapter/${props.chapter.chapterNumber}`}
      className={className}
    >
      <Icon className="size-4" />
      {label}
    </a>
  );
}

function ChapterLink(props: {
  chapter?: ManhwaChapterView;
  direction: 'next' | 'previous';
  series: ManhwaSeriesView;
}) {
  const isPrevious = props.direction === 'previous';
  const Icon = isPrevious ? ChevronLeftIcon : ChevronRightIcon;
  const alignmentClass = isPrevious
    ? 'md:justify-self-start'
    : 'md:justify-self-end';

  if (!props.chapter) {
    return <div className={cn('hidden md:block', alignmentClass)} />;
  }

  return (
    <a
      href={`/manhwa/${props.series.slug}/chapter/${props.chapter.chapterNumber}`}
      className={cn(
        'flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/5 p-4 text-neutral-200 transition hover:bg-white/10 hover:text-neutral-50',
        alignmentClass,
        !isPrevious && 'md:flex-row-reverse md:text-right'
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-neutral-400">
          {isPrevious ? 'Previous chapter' : 'Next chapter'}
        </span>
        <span className="block truncate font-medium">
          {props.chapter.title}
        </span>
      </span>
    </a>
  );
}

function ReaderPanel(props: { panel: ManhwaPanelView; panelNumber: number }) {
  return (
    <figure className="border-b border-white/5 bg-black last:border-b-0">
      <div className="relative isolate">
        {props.panel.imagePath ? (
          <img
            src={props.panel.imagePath}
            alt={props.panel.alt}
            loading={props.panelNumber <= 2 ? 'eager' : 'lazy'}
            className="block h-auto w-full"
          />
        ) : (
          <div
            aria-hidden="true"
            className="min-h-[40rem] bg-[radial-gradient(circle_at_50%_18%,oklch(0.42_0.13_293),transparent_18rem),linear-gradient(180deg,oklch(0.12_0.02_293),oklch(0.05_0.01_260))]"
          />
        )}
        <PanelTextLayer
          hasImage={Boolean(props.panel.imagePath)}
          panel={props.panel}
          panelNumber={props.panelNumber}
        />
      </div>
    </figure>
  );
}

function PanelTextLayer(props: {
  hasImage: boolean;
  panel: ManhwaPanelView;
  panelNumber: number;
}) {
  const dialogue = props.panel.dialogue ?? [];
  const narration = props.panel.narration ?? '';
  const hasDialogue = dialogue.length > 0;
  const hasNarration = narration.trim().length > 0;

  if (props.hasImage || (!hasDialogue && !hasNarration)) {
    return null;
  }

  return (
    <figcaption
      className={cn(
        'pointer-events-none absolute inset-0 z-10 overflow-hidden',
        !props.hasImage && 'bg-black/10'
      )}
    >
      {hasNarration ? (
        <NarrationCaption
          className={getNarrationPlacement(props.panelNumber)}
          text={narration}
        />
      ) : null}
      {hasDialogue
        ? dialogue.map((line, index) => (
            <DialogueBubble
              key={`${line}-${index}`}
              line={line}
              placement={getDialoguePlacement(props.panelNumber, index)}
            />
          ))
        : null}
    </figcaption>
  );
}

function NarrationCaption(props: { className: string; text: string }) {
  return (
    <p
      className={cn(
        'absolute rounded-[0.15rem] border-2 border-neutral-950 bg-[#fff8e7] px-3 py-2 text-left text-[0.72rem] leading-5 font-bold text-neutral-950 shadow-[3px_3px_0_rgba(0,0,0,0.72)] sm:px-4 sm:py-2.5 sm:text-[0.84rem] sm:leading-6',
        props.className
      )}
    >
      {props.text}
    </p>
  );
}

function DialogueBubble(props: { line: string; placement: DialoguePlacement }) {
  const dialogue = splitDialogueLine(props.line);
  const isWhisper = /crown|maerith/i.test(dialogue.speaker ?? '');
  const bubbleStyle: CSSProperties = {
    borderRadius: isWhisper
      ? '47% 53% 48% 52% / 55% 45% 55% 45%'
      : '56% 44% 52% 48% / 48% 52% 48% 52%',
  };

  return (
    <p
      aria-label={
        dialogue.speaker
          ? `${dialogue.speaker}: ${dialogue.text}`
          : dialogue.text
      }
      style={bubbleStyle}
      className={cn(
        'absolute border-2 px-3.5 py-3 text-center text-[0.72rem] leading-5 font-extrabold text-neutral-950 shadow-[0_2px_0_rgba(0,0,0,0.95),0_10px_22px_rgba(0,0,0,0.28)] sm:px-5 sm:py-4 sm:text-[0.86rem] sm:leading-6',
        props.placement.className,
        isWhisper
          ? 'border-violet-950 bg-[#f5f0ff] italic shadow-[0_2px_0_rgba(46,16,101,0.95),0_12px_24px_rgba(0,0,0,0.3)]'
          : 'border-neutral-950 bg-white',
        getBubbleTailClass(props.placement.tail, isWhisper)
      )}
    >
      <span>{dialogue.text}</span>
    </p>
  );
}

function splitDialogueLine(line: string) {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) {
    return {
      speaker: undefined,
      text: line,
    };
  }

  return {
    speaker: line.slice(0, separatorIndex).trim(),
    text: line.slice(separatorIndex + 1).trim(),
  };
}

type BubbleTail = 'down-left' | 'down-right' | 'thought-left' | 'thought-right';

interface DialoguePlacement {
  className: string;
  tail: BubbleTail;
}

interface PanelTextLayout {
  dialogue?: DialoguePlacement[];
  narration?: string;
}

const panelTextLayouts: Record<number, PanelTextLayout> = {
  1: {
    narration: 'left-[6%] top-[7%] max-w-[55%] sm:max-w-[42%]',
    dialogue: [
      {
        className: 'right-[6%] top-[20%] max-w-[56%] sm:max-w-[42%]',
        tail: 'thought-right',
      },
    ],
  },
  2: {
    narration: 'right-[7%] top-[8%] max-w-[58%] sm:max-w-[46%]',
    dialogue: [
      {
        className: 'left-[7%] top-[25%] max-w-[42%] sm:max-w-[34%]',
        tail: 'down-left',
      },
      {
        className: 'right-[8%] bottom-[15%] max-w-[52%] sm:max-w-[40%]',
        tail: 'thought-right',
      },
    ],
  },
  3: {
    narration: 'left-[7%] top-[9%] max-w-[52%] sm:max-w-[40%]',
    dialogue: [
      {
        className: 'right-[7%] top-[28%] max-w-[50%] sm:max-w-[38%]',
        tail: 'down-right',
      },
    ],
  },
  4: {
    narration: 'left-[8%] bottom-[13%] max-w-[74%] sm:max-w-[58%]',
  },
  5: {
    narration: 'left-[7%] top-[8%] max-w-[58%] sm:max-w-[44%]',
    dialogue: [
      {
        className: 'right-[7%] bottom-[18%] max-w-[42%] sm:max-w-[34%]',
        tail: 'down-right',
      },
    ],
  },
  6: {
    narration: 'right-[7%] top-[8%] max-w-[62%] sm:max-w-[48%]',
    dialogue: [
      {
        className: 'left-[7%] bottom-[13%] max-w-[68%] sm:max-w-[52%]',
        tail: 'down-left',
      },
    ],
  },
  7: {
    narration: 'left-[7%] top-[7%] max-w-[60%] sm:max-w-[46%]',
    dialogue: [
      {
        className: 'right-[7%] top-[24%] max-w-[58%] sm:max-w-[44%]',
        tail: 'thought-right',
      },
      {
        className: 'left-[7%] bottom-[28%] max-w-[48%] sm:max-w-[38%]',
        tail: 'down-left',
      },
      {
        className: 'right-[10%] bottom-[10%] max-w-[46%] sm:max-w-[36%]',
        tail: 'down-right',
      },
    ],
  },
  8: {
    narration: 'right-[7%] top-[8%] max-w-[56%] sm:max-w-[42%]',
    dialogue: [
      {
        className: 'left-[7%] top-[30%] max-w-[54%] sm:max-w-[40%]',
        tail: 'down-left',
      },
      {
        className: 'right-[8%] bottom-[17%] max-w-[50%] sm:max-w-[38%]',
        tail: 'down-right',
      },
    ],
  },
  9: {
    narration: 'left-[7%] top-[8%] max-w-[64%] sm:max-w-[50%]',
    dialogue: [
      {
        className: 'right-[7%] top-[30%] max-w-[58%] sm:max-w-[44%]',
        tail: 'thought-right',
      },
      {
        className: 'left-[8%] bottom-[15%] max-w-[58%] sm:max-w-[44%]',
        tail: 'down-left',
      },
    ],
  },
  10: {
    narration: 'right-[7%] top-[7%] max-w-[68%] sm:max-w-[52%]',
    dialogue: [
      {
        className: 'left-[7%] top-[34%] max-w-[62%] sm:max-w-[48%]',
        tail: 'down-left',
      },
      {
        className: 'right-[7%] bottom-[13%] max-w-[58%] sm:max-w-[44%]',
        tail: 'down-right',
      },
    ],
  },
  11: {
    narration: 'left-[7%] top-[7%] max-w-[62%] sm:max-w-[48%]',
    dialogue: [
      {
        className: 'right-[7%] top-[28%] max-w-[38%] sm:max-w-[30%]',
        tail: 'thought-right',
      },
      {
        className: 'left-[7%] bottom-[13%] max-w-[48%] sm:max-w-[38%]',
        tail: 'down-left',
      },
    ],
  },
  12: {
    narration: 'left-[7%] top-[8%] max-w-[48%] sm:max-w-[36%]',
    dialogue: [
      {
        className: 'right-[6%] bottom-[13%] max-w-[78%] sm:max-w-[58%]',
        tail: 'down-right',
      },
    ],
  },
};

const fallbackDialoguePlacements: DialoguePlacement[] = [
  {
    className: 'left-[7%] top-[24%] max-w-[60%] sm:max-w-[44%]',
    tail: 'down-left',
  },
  {
    className: 'right-[7%] top-[45%] max-w-[58%] sm:max-w-[42%]',
    tail: 'down-right',
  },
  {
    className: 'left-[9%] bottom-[12%] max-w-[68%] sm:max-w-[50%]',
    tail: 'down-left',
  },
];

function getNarrationPlacement(panelNumber: number) {
  return (
    panelTextLayouts[panelNumber]?.narration ??
    'left-[7%] top-[8%] max-w-[66%] sm:max-w-[50%]'
  );
}

function getDialoguePlacement(panelNumber: number, index: number) {
  const fallback =
    fallbackDialoguePlacements[index % fallbackDialoguePlacements.length];

  return (
    panelTextLayouts[panelNumber]?.dialogue?.[index] ??
    fallback ?? {
      className: 'left-[7%] top-[24%] max-w-[60%] sm:max-w-[44%]',
      tail: 'down-left',
    }
  );
}

function getBubbleTailClass(tail: BubbleTail, isWhisper: boolean) {
  if (isWhisper) {
    return cn(
      'after:border-violet-950 before:border-violet-950 before:absolute before:rounded-full before:border-2 before:bg-[#f5f0ff] after:absolute after:rounded-full after:border-2 after:bg-[#f5f0ff]',
      tail === 'thought-right'
        ? 'before:right-5 before:-bottom-5 before:size-2 after:right-9 after:-bottom-2 after:size-3'
        : 'before:-bottom-5 before:left-5 before:size-2 after:-bottom-2 after:left-9 after:size-3'
    );
  }

  return cn(
    'after:absolute after:-bottom-1.5 after:size-4 after:rotate-45 after:border-r-2 after:border-b-2 after:border-neutral-950 after:bg-white',
    tail === 'down-right' ? 'after:right-10' : 'after:left-10'
  );
}
