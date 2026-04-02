import { ButtonLink } from '@/components/ui/button-link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  PageLayout,
  PageLayoutContent,
  PageLayoutTopBar,
  PageLayoutTopBarTitle,
} from '@/layout/manager/page-layout';

export const PageDashboard = () => {
  return (
    <PageLayout>
      <PageLayoutTopBar>
        <PageLayoutTopBarTitle>Backoffice Overview</PageLayoutTopBarTitle>
      </PageLayoutTopBar>
      <PageLayoutContent containerClassName="max-w-4xl">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Support Lookup</CardTitle>
              <CardDescription>
                Search by license key, redeem code, installation ID, order ID,
                Lemon Squeezy IDs, or email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ButtonLink to="/manager/licenses" variant="secondary">
                Open support lookup
              </ButtonLink>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Staff Accounts</CardTitle>
              <CardDescription>
                Manage internal admin and support access for the backoffice.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Staff management remains available while the product-facing
              support tooling is being added.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Jobs And Provider Ops</CardTitle>
              <CardDescription>
                Operational visibility now starts here while deeper retry and
                incident tooling is still being built.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <ButtonLink to="/manager/jobs" variant="secondary">
                Open jobs
              </ButtonLink>
              <ButtonLink to="/manager/providers" variant="secondary">
                Open provider ops
              </ButtonLink>
            </CardContent>
          </Card>
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
};
