import { type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import '@/lib/i18n';

import { PageMihonNayoviSetupGuide } from '@/features/public/page-ethical-guides';

interface PublicSectionMockProps {
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title?: ReactNode;
}

vi.mock('@/features/public/public-shell', () => ({
  PublicSection: (props: PublicSectionMockProps) => (
    <>
      {props.eyebrow}
      {props.title}
      {props.description}
      {props.children}
    </>
  ),
  PublicShell: (props: { children: ReactNode }) => <>{props.children}</>,
}));

describe('PageMihonNayoviSetupGuide', () => {
  it('leads with a simple reader benefit and free-trial next step', () => {
    const html = renderToStaticMarkup(<PageMihonNayoviSetupGuide />);

    expect(html).toContain(
      'Mihon and Tachiyomi readers: get started with Nayovi'
    );
    expect(html).toContain(
      'Nayovi is a separate Android app for translating manga as you read.'
    );
    expect(html).toContain(
      'Try free translation tokens—no card required.'
    );
  });

  it('links the first official-install recommendation to the download page', () => {
    const html = renderToStaticMarkup(<PageMihonNayoviSetupGuide />);

    expect(html).toContain(
      '<a href="/download">Download Nayovi from this site</a>'
    );
  });
});
