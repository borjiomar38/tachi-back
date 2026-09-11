import { createFileRoute } from '@tanstack/react-router';

import { envServer } from '@/env/server';
import { deliverPurchaseEmails } from '@/server/payments/token-purchase-mail';

export const Route = createFileRoute('/api/cron/purchase-emails')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (
          !envServer.CRON_SECRET ||
          request.headers.get('authorization') !==
            `Bearer ${envServer.CRON_SECRET}`
        ) {
          return Response.json({ ok: false }, { status: 401 });
        }
        return Response.json(
          { ok: true, data: await deliverPurchaseEmails() },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      },
    },
  },
});
