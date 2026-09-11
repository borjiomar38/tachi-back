import { createFileRoute } from '@tanstack/react-router';

import { getTokenCatalog } from '@/server/payments/token-catalog';

export const Route = createFileRoute('/api/mobile/token-packs')({
  server: {
    handlers: {
      GET: async () =>
        Response.json(
          { ok: true, data: await getTokenCatalog() },
          { headers: { 'Cache-Control': 'no-store' } }
        ),
    },
  },
});
