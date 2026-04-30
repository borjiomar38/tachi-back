import { createFileRoute, Outlet } from '@tanstack/react-router';

import { getPageTitle } from '@/lib/get-page-title';

import { PageError } from '@/components/errors/page-error';

import { GuardPublicOnly } from '@/features/auth/guard-public-only';
import { LayoutLogin } from '@/features/auth/layout-login';

export const Route = createFileRoute('/login')({
  component: RouteComponent,
  notFoundComponent: () => <PageError type="404" />,
  errorComponent: () => <PageError type="error-boundary" />,
  head: () => ({
    meta: [
      {
        title: getPageTitle('Sign In'),
      },
      {
        name: 'robots',
        content: 'noindex, nofollow',
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <GuardPublicOnly>
      <LayoutLogin>
        <Outlet />
      </LayoutLogin>
    </GuardPublicOnly>
  );
}
