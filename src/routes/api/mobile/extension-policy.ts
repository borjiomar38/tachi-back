import { createFileRoute } from '@tanstack/react-router';

import { listBlockedExtensions } from '@/server/services/extension-access-policy';

export const Route = createFileRoute('/api/mobile/extension-policy')({
  server: {
    handlers: {
      GET: async () => {
        const blockedExtensions = await listBlockedExtensions();

        return Response.json({
          data: {
            blockedExtensions,
            generatedAt: new Date().toISOString(),
          },
          ok: true,
        });
      },
    },
  },
});
