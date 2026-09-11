import { createFileRoute } from '@tanstack/react-router';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import { buildAndroidAssetLinks } from '@/features/public/purchase-links';

export const Route = createFileRoute('/.well-known/assetlinks.json')({
  server: {
    handlers: {
      GET: () => {
        return Response.json(
          buildAndroidAssetLinks(
            envClient.VITE_ANDROID_APP_ID,
            envServer.ANDROID_APP_LINK_SHA256_FINGERPRINTS ?? ''
          ),
          { headers: { 'Cache-Control': 'public, max-age=300' } }
        );
      },
    },
  },
});
