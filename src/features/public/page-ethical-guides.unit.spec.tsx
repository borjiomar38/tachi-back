import { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PageMihonNayoviSetupGuide } from '@/features/public/page-ethical-guides';

vi.mock('@/features/public/public-shell', () => ({
  PublicSection: (props: { children: ReactNode }) => <>{props.children}</>,
  PublicShell: (props: { children: ReactNode }) => <>{props.children}</>,
}));

describe('PageMihonNayoviSetupGuide', () => {
  it('links the first official-install recommendation to the download page', () => {
    const html = renderToStaticMarkup(<PageMihonNayoviSetupGuide />);

    expect(html).toContain(
      '<a href="/download">Download Nayovi from this site</a>'
    );
  });
});
