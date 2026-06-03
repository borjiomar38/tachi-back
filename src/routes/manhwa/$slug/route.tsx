import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/manhwa/$slug')({
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
