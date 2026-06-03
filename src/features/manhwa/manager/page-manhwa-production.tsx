import {
  BookOpenTextIcon,
  CheckCircle2Icon,
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

  return (
    <PageLayout>
      <PageLayoutTopBar
        endActions={
          <a
            href={`/manhwa/${overview.seriesSlug}`}
            className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition hover:bg-accent"
          >
            <BookOpenTextIcon className="size-4" />
            Reader
          </a>
        }
      >
        <PageLayoutTopBarTitle>Manhwa production</PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="max-w-7xl">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
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
            <div
              className="flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground"
              key={reference.id}
              title={`${reference.id}: ${reference.status}`}
            >
              {reference.generated && reference.protectedPath ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                  src={reference.protectedPath}
                />
              ) : (
                <SparklesIcon className="size-4 opacity-60" />
              )}
            </div>
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

function humanizeTask(value?: string) {
  if (!value) {
    return 'unknown';
  }

  return value
    .split('-')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}
