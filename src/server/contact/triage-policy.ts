import { z } from 'zod';

export const CONTACT_TRIAGE_TAGS = [
  'spam',
  'scam',
  'phishing',
  'fraud',
] as const;

export const zContactTriageClassification = z.enum([
  'malicious',
  'irrelevant',
  'actionable',
  'uncertain',
]);

export const zContactTriageResult = z.object({
  classification: zContactTriageClassification,
  reason: z.string().min(1).max(500),
  tags: z.array(z.enum(CONTACT_TRIAGE_TAGS)).max(CONTACT_TRIAGE_TAGS.length),
});

export type ContactTriageResult = z.infer<typeof zContactTriageResult>;

export interface ContactNotificationDecision {
  notifySupport: boolean;
  routing: 'notify' | 'suppress';
  tags: ContactTriageResult['tags'];
}

export const resolveContactTriage = (
  result: ContactTriageResult
): ContactNotificationDecision => {
  const suppressEmail = ['malicious', 'irrelevant'].includes(
    result.classification
  );

  return {
    notifySupport: !suppressEmail,
    routing: suppressEmail ? 'suppress' : 'notify',
    tags: result.classification === 'malicious' ? result.tags : [],
  };
};
