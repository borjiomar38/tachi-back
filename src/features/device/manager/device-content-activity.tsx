import dayjs from 'dayjs';
import { BanIcon, BookOpenIcon, ImageOffIcon, PuzzleIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmResponsiveDrawer } from '@/components/ui/confirm-responsive-drawer';
import { DataList, DataListEmptyState } from '@/components/ui/datalist';

import { permissionDevice } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';

export type VisitedTitle = {
  extensionLang?: string | null;
  extensionName?: string | null;
  extensionPackageName?: string | null;
  firstVisitedAt: Date;
  id: string;
  lastVisitedAt: Date;
  mangaUrl: string;
  sourceId: string;
  sourceLanguage?: string | null;
  sourceName?: string | null;
  thumbnailUrl?: string | null;
  title: string;
  visitCount: number;
};

export type VisitedExtension = {
  blocked: boolean;
  extensionLang?: string | null;
  extensionName: string;
  firstVisitedAt: Date;
  iconUrl?: string | null;
  id: string;
  lastVisitedAt: Date;
  packageName: string;
  sourceId?: string | null;
  sourceLanguage?: string | null;
  sourceName?: string | null;
  titlesOpened: number;
  visitCount: number;
};

export function VisitedTitlesCard(props: { titles: VisitedTitle[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Visited titles</CardTitle>
            <CardDescription>
              Manhwa and manga pages opened on this installation. Covers are
              loaded directly from the extension URL and are never uploaded.
            </CardDescription>
          </div>
          <Badge variant="secondary">{props.titles.length} titles</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!props.titles.length ? (
          <DataList>
            <DataListEmptyState>
              No manga or manhwa page has been visited on this installation yet.
            </DataListEmptyState>
          </DataList>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {props.titles.map((title) => (
              <VisitedTitleCard key={title.id} title={title} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VisitedTitleCard(props: { title: VisitedTitle }) {
  const { title } = props;

  return (
    <div className="flex min-w-0 gap-3 rounded-md border bg-card/40 p-3">
      <RemoteImage
        alt={`${title.title} cover`}
        className="h-24 w-16 shrink-0 rounded-sm"
        fallback={<ImageOffIcon className="size-5" />}
        src={title.thumbnailUrl}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <a
          className="line-clamp-2 text-sm leading-5 font-semibold hover:underline"
          href={title.mangaUrl}
          rel="noreferrer"
          target="_blank"
        >
          {title.title}
        </a>
        <div className="mt-1 truncate text-xs text-muted-foreground">
          {title.sourceName ?? title.extensionName ?? 'Unknown source'}
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2 text-[0.7rem] text-muted-foreground">
          {(title.sourceLanguage ?? title.extensionLang) ? (
            <Badge variant="secondary">
              {title.sourceLanguage ?? title.extensionLang}
            </Badge>
          ) : null}
          <span>{title.visitCount} visits</span>
          <span>·</span>
          <span>{dayjs(title.lastVisitedAt).fromNow()}</span>
        </div>
      </div>
    </div>
  );
}

export function VisitedExtensionsCard(props: {
  extensions: VisitedExtension[];
  isUpdatingPackage?: string;
  onSetBlocked: (
    extension: VisitedExtension,
    blocked: boolean
  ) => Promise<void>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Visited extensions</CardTitle>
            <CardDescription>
              Extensions used by this installation. Blocking an extension here
              prevents it from being used by every installation.
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {props.extensions.length} extensions
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {!props.extensions.length ? (
          <DataList>
            <DataListEmptyState>
              No extension has been visited on this installation yet.
            </DataListEmptyState>
          </DataList>
        ) : (
          <div className="space-y-3">
            {props.extensions.map((extension) => (
              <div
                className="flex flex-col gap-3 rounded-md border bg-card/40 p-3 sm:flex-row sm:items-center"
                key={extension.id}
              >
                <RemoteImage
                  alt={`${extension.extensionName} logo`}
                  className="size-12 shrink-0 rounded-md"
                  fallback={<PuzzleIcon className="size-5" />}
                  src={extension.iconUrl}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold">
                      {extension.extensionName}
                    </div>
                    <Badge
                      variant={extension.blocked ? 'negative' : 'positive'}
                    >
                      {extension.blocked ? 'Blocked globally' : 'Allowed'}
                    </Badge>
                    {extension.extensionLang ? (
                      <Badge variant="secondary">
                        {extension.extensionLang}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs break-all text-muted-foreground">
                    {extension.packageName}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>{extension.sourceName ?? 'Unknown source'}</span>
                    <span>{extension.titlesOpened} titles opened</span>
                    <span>{extension.visitCount} visits</span>
                    <span>
                      Last used {dayjs(extension.lastVisitedAt).fromNow()}
                    </span>
                  </div>
                </div>
                <WithPermissions permissions={[permissionDevice.revoke]}>
                  <ConfirmResponsiveDrawer
                    confirmText={
                      extension.blocked
                        ? 'Unblock extension'
                        : 'Block extension'
                    }
                    confirmVariant={
                      extension.blocked ? 'default' : 'destructive'
                    }
                    description={
                      extension.blocked
                        ? 'This extension will be available again on every installation after their policy refresh.'
                        : 'This blocks the entire extension package for every installation, including all of its sources.'
                    }
                    onConfirm={() =>
                      props.onSetBlocked(extension, !extension.blocked)
                    }
                    title={`${extension.blocked ? 'Unblock' : 'Block'} ${extension.extensionName}?`}
                  >
                    <Button
                      loading={
                        props.isUpdatingPackage === extension.packageName
                      }
                      size="sm"
                      variant={extension.blocked ? 'secondary' : 'destructive'}
                    >
                      {extension.blocked ? <BookOpenIcon /> : <BanIcon />}
                      {extension.blocked ? 'Unblock' : 'Block extension'}
                    </Button>
                  </ConfirmResponsiveDrawer>
                </WithPermissions>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemoteImage(props: {
  alt: string;
  className: string;
  fallback: ReactNode;
  src?: string | null;
}) {
  const [failed, setFailed] = useState(false);

  if (!props.src || failed) {
    return (
      <div
        aria-label={props.alt}
        className={`${props.className} flex items-center justify-center border bg-muted text-muted-foreground`}
        role="img"
      >
        {props.fallback}
      </div>
    );
  }

  return (
    <img
      alt={props.alt}
      className={`${props.className} border bg-muted object-cover`}
      loading="lazy"
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      src={props.src}
    />
  );
}
