import { describe, expect, it } from 'vitest';

import {
  type ContactTriageAudit,
  getContactTriageView,
  parseContactTriageMetadata,
  replaceContactHumanNotes,
  writeContactTriageMetadata,
} from '@/server/contact/triage-audit';

describe('contact triage audit', () => {
  const audit = {
    attempts: 2,
    classification: 'malicious' as const,
    processedAt: '2026-07-16T10:26:44.209Z',
    reason: 'Obvious investment scam.',
    tags: ['spam', 'scam'],
  } satisfies ContactTriageAudit;

  it('separates human notes from machine audit metadata', () => {
    const stored = writeContactTriageMetadata('Human-only note', audit);

    expect(parseContactTriageMetadata(stored)).toEqual({
      audit,
      humanNotes: 'Human-only note',
    });
  });

  it('updates human notes without deleting the audit', () => {
    const stored = writeContactTriageMetadata('Old note', audit);
    const updated = replaceContactHumanNotes(stored, 'New note');

    expect(parseContactTriageMetadata(updated)).toEqual({
      audit,
      humanNotes: 'New note',
    });
  });

  it('maps persisted audit data into a clean UI view', () => {
    const stored = writeContactTriageMetadata('', audit);

    expect(
      getContactTriageView('public_landing_form:triage_ignored', stored)
    ).toMatchObject({
      attempts: 2,
      classification: 'malicious',
      reason: 'Obvious investment scam.',
      state: 'filtered',
      tags: ['spam', 'scam'],
    });
  });
});
