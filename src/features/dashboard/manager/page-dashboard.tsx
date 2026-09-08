import { useTranslation } from 'react-i18next';

import { DashboardInstallationOverview } from '@/features/dashboard/manager/dashboard-installation-overview';
import { DashboardShortcuts } from '@/features/dashboard/manager/dashboard-shortcuts';
import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

export const PageDashboard = () => {
  const { t } = useTranslation(['dashboard']);

  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>
          {t('dashboard:pageTitle')}
        </PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="max-w-7xl pb-8">
        <div className="space-y-4">
          <DashboardInstallationOverview />
          <DashboardShortcuts />
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
