import { useTranslation } from 'react-i18next';

import type { Outputs } from '@/lib/orpc/types';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import { useReleaseHistoryStore } from '@/features/version-history/manager/release-history-store';

interface ReleaseHistoryCardProps {
  release: Outputs['mobileRelease']['list']['items'][number];
}

export const ReleaseHistoryCard = ({ release }: ReleaseHistoryCardProps) => {
  const { t, i18n } = useTranslation(['releaseHistory']);
  const selectedLocale = useReleaseHistoryStore(
    (state) => state.locales[release.id]
  );
  const setLocale = useReleaseHistoryStore((state) => state.setLocale);
  const info = release.releaseInfo;
  const locale =
    [
      selectedLocale,
      i18n.language,
      i18n.language.split('-')[0],
      info.defaultLocale,
    ].find((candidate) => candidate && info.locales[candidate]) ??
    info.defaultLocale;
  const content = info.locales[locale];
  if (!content) return <p role="alert">{t('releaseHistory:error')}</p>;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 px-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold">
              {release.versionName} ·{' '}
              {t('releaseHistory:build', { code: release.versionCode })}
            </h3>
            <Badge variant={release.publishedAt ? 'positive' : 'brand'}>
              {t(
                release.publishedAt
                  ? 'releaseHistory:published'
                  : 'releaseHistory:pending'
              )}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {release.platform} · {release.channel}
          </p>
          {release.publishedAt && (
            <p className="text-xs text-muted-foreground">
              {new Intl.DateTimeFormat(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(release.publishedAt)}
            </p>
          )}
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t('releaseHistory:language')}
        >
          {Object.keys(info.locales).map((tag) => (
            <Button
              key={tag}
              size="sm"
              variant="secondary"
              className={
                tag === locale
                  ? 'border-brand-500 bg-brand-500/15 text-brand-700 hover:bg-brand-500/25 dark:text-brand-300'
                  : undefined
              }
              aria-pressed={tag === locale}
              onClick={() => setLocale(release.id, tag)}
            >
              {tag.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-6">
        <div
          className="space-y-5 border-t pt-5 text-start break-words"
          lang={locale}
          dir={/^(ar|he|fa|ur)(-|$)/.test(locale) ? 'rtl' : 'ltr'}
        >
          <h4 className="text-xl font-semibold">{content.title}</h4>
          <p className="text-muted-foreground">{content.summary}</p>
          {content.highlights.map((highlight, index) => (
            <div key={index} className="space-y-1.5">
              <h5 className="font-semibold">{highlight.title}</h5>
              <p className="text-muted-foreground">{highlight.body}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
