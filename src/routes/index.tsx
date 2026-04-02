import { createFileRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { z } from 'zod';

import { buildPublicPageHead } from '@/features/public/head';
import { PageLanding } from '@/features/public/page-landing';
import { getPublicTokenPacks } from '@/features/public/server';

export const Route = createFileRoute('/')({
  component: RouteComponent,
  validateSearch: zodValidator(
    z.object({
      contact: z.enum(['sent', 'error', 'invalid']).optional().catch(undefined),
    })
  ),
  loader: () => getPublicTokenPacks(),
  head: () =>
    buildPublicPageHead(
      'Hosted OCR and Translation',
      'Public landing page for Tachiyomi Back, covering token packs, hosted OCR and translation, and redeem-code activation.'
    ),
});

function RouteComponent() {
  const tokenPacks = Route.useLoaderData();
  const search = Route.useSearch();

  return (
    <PageLanding
      tokenPacks={tokenPacks}
      contactStatus={search.contact || undefined}
    />
  );
}
