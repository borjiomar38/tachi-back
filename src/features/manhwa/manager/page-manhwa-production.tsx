import {
  ActivityIcon,
  AlertTriangleIcon,
  BookOpenTextIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  ImageIcon,
  LockIcon,
  SparklesIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import type {
  ManhwaManagerCharacter,
  ManhwaManagerOverview,
} from '@/features/manhwa/manager/server';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

interface PageManhwaProductionProps {
  overview: ManhwaManagerOverview;
}

export const PageManhwaProduction = ({
  overview,
}: PageManhwaProductionProps) => {
  if (!overview.canView) {
    return (
      <PageLayout>
        <PageLayoutTopBar>
          <PageLayoutTopBarTitle>Manhwa production</PageLayoutTopBarTitle>
        </PageLayoutTopBar>
        <PageLayoutContent>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LockIcon className="size-4" />
                Admin only
              </CardTitle>
              <CardDescription>
                Character dossiers, scenario indexes, and private reference
                images are restricted to admin accounts.
              </CardDescription>
            </CardHeader>
          </Card>
        </PageLayoutContent>
      </PageLayout>
    );
  }

  const dossierReadyCount = overview.characters.filter(
    (character) => character.dossierReady
  ).length;
  const chapterRendering = overview.chapterRendering;
  const chapterProgress =
    chapterRendering.totalPanels > 0
      ? Math.round(
          (chapterRendering.generatedCount / chapterRendering.totalPanels) * 100
        )
      : 0;

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <div className="flex items-center gap-2">
            <a
              href="/manager/manhwa"
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
            >
              All manhwa
            </a>
            <a
              href={`/manhwa/${overview.seriesSlug}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
            >
              <BookOpenTextIcon className="size-4" />
              Reader
            </a>
          </div>
        }
      >
        <PageLayoutTopBarTitle>Manhwa production</PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="max-w-7xl">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="Series"
              subLabel={overview.seriesSlug}
              value="THE ECLIPSE CROWN"
            />
            <SummaryCard
              label="Next task"
              subLabel={overview.nextTask?.characterId ?? 'preproduction'}
              value={humanizeTask(overview.nextTask?.taskType)}
              variant={
                overview.preproduction.readyForChapterGeneration
                  ? 'positive'
                  : 'warning'
              }
            />
            <SummaryCard
              label="Dossiers"
              subLabel="character folders"
              value={`${dossierReadyCount}/${overview.characters.length}`}
              variant={
                dossierReadyCount === overview.characters.length
                  ? 'positive'
                  : 'warning'
              }
            />
            <SummaryCard
              label="References"
              subLabel={`${overview.referenceStatus.missingCount} missing`}
              value={`${overview.referenceStatus.generatedCount}/${overview.referenceStatus.totalCount}`}
              variant={
                overview.referenceStatus.missingCount === 0
                  ? 'positive'
                  : 'warning'
              }
            />
            <SummaryCard
              label="Chapter 1"
              subLabel={chapterSummaryLabel(chapterRendering)}
              value={`${chapterRendering.generatedCount}/${chapterRendering.totalPanels}`}
              variant={
                chapterRendering.failedCount > 0
                  ? 'warning'
                  : chapterRendering.missingCount === 0
                    ? 'positive'
                    : 'warning'
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Build order</CardTitle>
                  <CardDescription>
                    The chapter renderer stays blocked until these gates are
                    complete, so character identity remains stable.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <Phase
                      done={overview.preproduction.scenarioStrategyReady}
                      label="Story engine"
                    />
                    <Phase
                      done={overview.preproduction.seasonScenarioReady}
                      label="Season map"
                    />
                    <Phase
                      done={overview.preproduction.allCharacterDossiersReady}
                      label="Character dossiers"
                    />
                    <Phase
                      done={overview.preproduction.readyForCharacterReferences}
                      label="Reference images unlocked"
                    />
                    <Phase
                      done={overview.preproduction.chapterScenarioReady}
                      label="Chapter scenario"
                    />
                    <Phase
                      done={overview.preproduction.readyForChapterGeneration}
                      label="Chapter rendering unlocked"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Character building</CardTitle>
                  <CardDescription>
                    One dossier is built at a time, then five private reference
                    images per recurring character.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {overview.characters.map((character) => (
                      <CharacterRow character={character} key={character.id} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2">
                      <ActivityIcon className="size-4" />
                      Chapter rendering
                    </span>
                    <Badge
                      variant={
                        chapterRendering.failedCount > 0
                          ? 'warning'
                          : chapterRendering.active
                            ? 'brand'
                            : chapterRendering.missingCount === 0
                              ? 'positive'
                              : 'secondary'
                      }
                      size="sm"
                    >
                      {chapterRendering.active
                        ? 'rendering'
                        : chapterRendering.missingCount === 0
                          ? 'complete'
                          : 'waiting'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Private chapter panel state from the rendered image manifest
                    and protected image folder.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{chapterProgress}% ready</span>
                      <span>
                        {chapterRendering.generatedCount}/
                        {chapterRendering.totalPanels} panels
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${chapterProgress}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <KeyValue
                      label="Active"
                      value={
                        chapterRendering.active
                          ? `panel ${chapterRendering.activePanelNumber ?? 'unknown'}`
                          : 'no active render'
                      }
                    />
                    <KeyValue
                      label="Next panel"
                      value={
                        chapterRendering.nextPanelNumber
                          ? `panel ${chapterRendering.nextPanelNumber}`
                          : 'none'
                      }
                    />
                    <KeyValue
                      label="Daily cap"
                      value={`${chapterRendering.dailyLimit}/day`}
                    />
                    <KeyValue
                      label="Run cap"
                      value={`${chapterRendering.runLimit}/run`}
                    />
                    <KeyValue
                      label="Status"
                      value={humanizeTask(chapterRendering.status)}
                    />
                    <KeyValue
                      label="Status updated"
                      value={formatDateTime(chapterRendering.statusUpdatedAt)}
                    />
                    <KeyValue
                      label="Last image"
                      value={formatDateTime(
                        chapterRendering.lastPanelGeneratedAt
                      )}
                    />
                    <KeyValue
                      label="Manifest"
                      value={
                        chapterRendering.manifestAvailable
                          ? formatDateTime(chapterRendering.generatedAt)
                          : 'missing'
                      }
                    />
                  </div>
                  {chapterRendering.statusStale ? (
                    <div className="flex items-start gap-2 rounded-md border border-warning-500/30 bg-warning-500/10 p-3 text-warning-800 dark:text-warning-100">
                      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="font-medium">Stale render status</p>
                        <p className="mt-1">
                          The last running marker is older than expected; check
                          the image cron log before forcing a retry.
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {chapterRendering.renderedPanels.length ? (
                    <PanelList
                      label="Ready panels"
                      panels={chapterRendering.renderedPanels}
                    />
                  ) : null}
                  {chapterRendering.renderedThisRun.length ? (
                    <PanelList
                      label="Last run"
                      panels={chapterRendering.renderedThisRun}
                    />
                  ) : null}
                  {chapterRendering.failedPanels.length ? (
                    <div className="flex items-start gap-2 rounded-md border border-warning-500/30 bg-warning-500/10 p-3 text-warning-800 dark:text-warning-100">
                      <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                      <div>
                        <p className="font-medium">Failed panels</p>
                        <p className="mt-1">
                          {formatPanels(chapterRendering.failedPanels)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Private context</CardTitle>
                  <CardDescription>
                    Fast index used by the autonomous manhwa agent.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <KeyValue
                    label="Generated"
                    value={formatDateTime(overview.generatedAt)}
                  />
                  <KeyValue
                    label="Context root"
                    value={overview.contextRoot ?? 'default'}
                  />
                  <KeyValue
                    label="Story engine"
                    value={overview.files.storyEngine ? 'ready' : 'missing'}
                  />
                  <KeyValue
                    label="Season map"
                    value={overview.files.seasonMap ? 'ready' : 'missing'}
                  />
                  <KeyValue
                    label="Chapter scenario"
                    value={overview.files.chapterScenario ? 'ready' : 'missing'}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Next panel continuity</CardTitle>
                  <CardDescription>
                    The renderer uses this hint before creating the next final
                    chapter image.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <TextBlock
                    label="Continuity in"
                    value={overview.nextPanelHint?.visualContinuityIn}
                  />
                  <TextBlock
                    label="Bubble plan"
                    value={overview.nextPanelHint?.bubbleLayoutPlan}
                  />
                  <TextBlock
                    label="Continuity out"
                    value={overview.nextPanelHint?.visualContinuityOut}
                  />
                  {overview.nextPanelHint?.promptKeys.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {overview.nextPanelHint.promptKeys.map((key) => (
                        <Badge key={key} variant="secondary" size="sm">
                          {key}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};

function CharacterRow(props: { character: ManhwaManagerCharacter }) {
  return (
    <article className="grid gap-3 rounded-md border bg-background p-4 md:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{props.character.name}</h2>
          <Badge
            variant={props.character.dossierReady ? 'positive' : 'warning'}
            size="sm"
          >
            {props.character.dossierReady ? 'Dossier ready' : 'Dossier pending'}
          </Badge>
          <Badge variant="secondary" size="sm">
            {props.character.id}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{props.character.role}</p>
        {props.character.canonPrompt ? (
          <p className="line-clamp-2 text-sm leading-6">
            {props.character.canonPrompt}
          </p>
        ) : null}
        {props.character.bubblePlacementRule ? (
          <p className="text-xs leading-5 text-muted-foreground">
            {props.character.bubblePlacementRule}
          </p>
        ) : null}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <ImageIcon className="size-4" />
            References
          </span>
          <Badge
            variant={
              props.character.referenceMissingCount === 0
                ? 'positive'
                : 'warning'
            }
            size="sm"
          >
            {props.character.referenceGeneratedCount}/
            {props.character.referenceGeneratedCount +
              props.character.referenceMissingCount}
          </Badge>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {props.character.references.map((reference) => (
            <ReferenceTile
              character={props.character}
              key={reference.id}
              reference={reference}
            />
          ))}
        </div>
        {props.character.missingReferenceIds.length ? (
          <p className="text-xs leading-5 text-muted-foreground">
            Next missing: {props.character.missingReferenceIds[0]}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function ReferenceTile(props: {
  character: ManhwaManagerCharacter;
  reference: ManhwaManagerCharacter['references'][number];
}) {
  if (!props.reference.generated || !props.reference.protectedPath) {
    return (
      <div
        className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground"
        title={`${props.reference.id}: ${props.reference.status}`}
      >
        <SparklesIcon className="size-4 opacity-60" />
      </div>
    );
  }

  const title = `${props.character.name} - ${humanizeTask(props.reference.id)}`;

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            className="group flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground transition outline-none hover:border-primary/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            title={`${props.reference.id}: ${props.reference.status}`}
            type="button"
          />
        }
      >
        <img
          alt={title}
          className="size-full object-cover transition group-hover:scale-105"
          loading="lazy"
          src={props.reference.protectedPath}
        />
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="px-5 pt-5 pr-14">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {props.reference.id} · {props.reference.status}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="min-h-0 gap-3 px-5 pb-5">
          <div className="flex max-h-[calc(100svh-13rem)] min-h-0 items-center justify-center overflow-auto rounded-md border bg-black/95">
            <img
              alt={title}
              className="h-auto max-h-full w-auto max-w-full object-contain"
              src={props.reference.protectedPath}
            />
          </div>
          <a
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-primary hover:underline"
            href={props.reference.protectedPath}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLinkIcon className="size-4" />
            Open image
          </a>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function KeyValue(props: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-medium text-muted-foreground">
        {props.label}
      </dt>
      <dd className="font-medium break-words">{props.value}</dd>
    </div>
  );
}

function Phase(props: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm">
      <CheckCircle2Icon
        className={
          props.done
            ? 'size-4 text-positive-800 dark:text-positive-100'
            : 'size-4 text-muted-foreground'
        }
      />
      <span className={props.done ? 'font-medium' : 'text-muted-foreground'}>
        {props.label}
      </span>
    </div>
  );
}

function SummaryCard(props: {
  label: string;
  subLabel: string;
  value: string;
  variant?: 'default' | 'positive' | 'warning';
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{props.label}</CardDescription>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>{props.value}</span>
          {props.variant && props.variant !== 'default' ? (
            <Badge variant={props.variant} size="sm">
              {props.variant}
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>{props.subLabel}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function TextBlock(props: { label: string; value?: string }) {
  if (!props.value) {
    return null;
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
      <p className="leading-6">{props.value}</p>
    </div>
  );
}

function PanelList(props: { label: string; panels: number[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{props.label}</p>
      <div className="flex flex-wrap gap-1.5">
        {props.panels.map((panel) => (
          <Badge key={panel} variant="secondary" size="sm">
            panel {panel}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return 'missing';
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date
        .toISOString()
        .replace('T', ' ')
        .replace(/\.\d{3}Z$/, ' UTC');
}

function chapterSummaryLabel(
  rendering: ManhwaManagerOverview['chapterRendering']
) {
  if (rendering.active) {
    return `panel ${rendering.activePanelNumber ?? 'unknown'} rendering`;
  }

  if (rendering.missingCount === 0 && rendering.totalPanels > 0) {
    return 'all panels ready';
  }

  return `${rendering.missingCount} missing`;
}

function formatPanels(panels: number[]) {
  return panels.map((panel) => `panel ${panel}`).join(', ');
}

function humanizeTask(value?: string) {
  if (!value) {
    return 'unknown';
  }

  return value
    .split('-')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}
