import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';

// Used to type route param on UploadButton component
// Upload routes will be reintroduced with the real Tachiyomi Back job flow.
export type UploadRoutes = string;

export const Route = createFileRoute('/api/upload')({
  server: {
    handlers: {
      POST: ({ request }) => {
        if (envClient.VITE_IS_DEMO) {
          return new Response('Demo Mode', { status: 405 });
        }
        void request;
        return new Response(
          'Upload routes are not available during Phase 1 cleanup.',
          {
            status: 501,
          }
        );
      },
    },
  },
});
