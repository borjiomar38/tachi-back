import { Logo } from '@/components/brand/logo';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
} from '@/layout/app/page-layout';

export const PageHome = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar className="md:hidden">
        <Logo className="mx-auto w-24" />
      </PageLayoutTopBar>
      <PageLayoutContent>
        <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-6">
          <Logo className="h-12 w-auto" />
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              Tachiyomi Back foundation
            </h1>
            <p className="text-sm text-muted-foreground">
              The starter demo content has been removed. This app shell is now
              reserved for future internal and hosted workflow screens tied to
              payments, licenses, devices, and translation jobs.
            </p>
            <p className="text-sm text-muted-foreground">
              During Phase 1, the goal is to keep reusable infrastructure and
              remove unrelated starter business domains.
            </p>
          </div>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
