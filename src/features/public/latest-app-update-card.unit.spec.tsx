import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LatestAppUpdateCard } from '@/features/public/latest-app-update-card';

describe('LatestAppUpdateCard', () => {
  it('renders the current version, date, and public highlights', () => {
    const html = renderToStaticMarkup(
      <LatestAppUpdateCard
        update={{
          schemaVersion: 1,
          version: '0.17.46',
          publishedDate: '2026-09-23',
          title: 'Reliable reading position',
          summary: 'Chapters now reopen at the right reading position.',
          highlights: ['Keeps your place when you reopen a chapter'],
        }}
      />
    );

    expect(html).toContain('Nayovi 0.17.46');
    expect(html).toContain('Updated September 23, 2026');
    expect(html).toContain('Keeps your place when you reopen a chapter');
  });
});
