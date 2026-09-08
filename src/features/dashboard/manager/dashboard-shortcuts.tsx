import { useTranslation } from 'react-i18next';

import { ButtonLink } from '@/components/ui/button-link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const DashboardShortcuts = () => {
  const { t } = useTranslation(['dashboard']);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard:shortcuts.support.title')}</CardTitle>
          <CardDescription>
            {t('dashboard:shortcuts.support.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonLink to="/manager/licenses" variant="secondary">
            {t('dashboard:shortcuts.support.action')}
          </ButtonLink>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard:shortcuts.staff.title')}</CardTitle>
          <CardDescription>
            {t('dashboard:shortcuts.staff.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('dashboard:shortcuts.staff.content')}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard:shortcuts.operations.title')}</CardTitle>
          <CardDescription>
            {t('dashboard:shortcuts.operations.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ButtonLink to="/manager/jobs" variant="secondary">
            {t('dashboard:shortcuts.operations.jobs')}
          </ButtonLink>
          <ButtonLink to="/manager/providers" variant="secondary">
            {t('dashboard:shortcuts.operations.providers')}
          </ButtonLink>
          <ButtonLink to="/manager/versions" variant="secondary">
            {t('dashboard:shortcuts.operations.versions')}
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
};
