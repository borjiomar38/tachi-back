import { describe, expect, it } from 'vitest';

import {
  formatLatestPublicAppUpdateDate,
  parseLatestPublicAppUpdate,
} from '@/features/public/latest-app-update-policy';

const validUpdate = {
  schemaVersion: 1,
  version: '0.17.46',
  publishedDate: '2026-09-23',
  title: 'Reliable reading position',
  summary: 'Chapters now reopen at the correct reading position.',
  highlights: ['Keeps your place when you reopen a chapter'],
} as const;

describe('latest public app update policy', () => {
  it('accepts concise user-facing release information', () => {
    expect(parseLatestPublicAppUpdate(validUpdate)).toEqual(validUpdate);
    expect(formatLatestPublicAppUpdateDate(validUpdate.publishedDate)).toBe(
      'September 23, 2026'
    );
  });

  it.each([
    'Changed app/src/main/ReaderViewModel.kt',
    'Rotated a private key on the server',
    'See commit 1234567 on the release branch',
    'Fixed CVE-2026-1234 vulnerability',
    'Call https://internal.example.test/api/update',
  ])('rejects internal or sensitive text: %s', (summary) => {
    expect(() =>
      parseLatestPublicAppUpdate({ ...validUpdate, summary })
    ).toThrow();
  });

  it('rejects unapproved metadata fields', () => {
    expect(() =>
      parseLatestPublicAppUpdate({
        ...validUpdate,
        commitSha: 'bb4dcaa63c0d79cc4b3c2ddf28da913419813712',
      })
    ).toThrow();
  });
});
