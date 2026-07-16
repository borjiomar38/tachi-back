import { describe, expect, it } from 'vitest';

import {
  canQueueContactReanalysis,
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

  it('marks an ambiguous email outcome as non-retryable manual review', () => {
    const stored = writeContactTriageMetadata('', {
      ...audit,
      notificationAttemptedAt: '2026-07-16T10:27:00.000Z',
      notificationId: 'contact-contact-1',
    });

    expect(
      getContactTriageView(
        'public_landing_form:triage_notification_unknown',
        stored
      )
    ).toMatchObject({
      notification: 'unknown',
      state: 'delivery_unknown',
    });
  });

  it('maps an automatic customer reply into clean delivery details', () => {
    const stored = writeContactTriageMetadata('', {
      ...audit,
      repliedAt: '2026-07-16T10:28:00.000Z',
      replyAttemptedAt: '2026-07-16T10:27:00.000Z',
      replyId: 'contact-reply-contact-1',
      replyIntent: 'pricing',
      replySubject: 'Re: Nayovi plans',
    });

    expect(
      getContactTriageView(
        'public_landing_form:triage_customer_replied',
        stored
      )
    ).toMatchObject({
      notification: 'replied',
      replyIntent: 'pricing',
      replySubject: 'Re: Nayovi plans',
      state: 'replied',
    });
  });

  it('prevents reanalysis while an email delivery is in flight or unknown', () => {
    expect(
      canQueueContactReanalysis(
        'public_landing_form:triage_notification_sending'
      )
    ).toBe(false);
    expect(
      canQueueContactReanalysis(
        'public_landing_form:triage_notification_unknown'
      )
    ).toBe(false);
    expect(
      canQueueContactReanalysis(
        'public_landing_form:triage_customer_reply_sending'
      )
    ).toBe(false);
    expect(
      canQueueContactReanalysis(
        'public_landing_form:triage_customer_reply_unknown'
      )
    ).toBe(false);
    expect(canQueueContactReanalysis('public_landing_form:triage_failed')).toBe(
      true
    );
  });
});
