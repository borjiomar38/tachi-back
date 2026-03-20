import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/manager/')({
  component: RouteComponent,
  beforeLoad: () => {
    throw redirect({ to: '/manager/licenses' });
  },
});

function RouteComponent() {
  return null;
}
