import { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { androidApkDownload } from '@/features/public/download-assets';
import { PageDownload } from '@/features/public/page-download';

vi.mock('@/features/public/public-shell', () => ({
  PublicShell: (props: { children: ReactNode }) => <>{props.children}</>,
}));

describe('PageDownload', () => {
  it('connects legacy search intent to Nayovi before the APK action', () => {
    const html = renderToStaticMarkup(<PageDownload />);

    expect(html).toContain(
      'Arriving from a TachiyomiAT or Mihon search? Nayovi is the current branded Android APK and hosted translation path.'
    );
    expect(html).toContain(`href="${androidApkDownload.href}"`);
  });
});
