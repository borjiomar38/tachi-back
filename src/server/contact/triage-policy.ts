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

export const CONTACT_REPLY_INTENTS = [
  'none',
  'help',
  'pricing',
  'help_and_pricing',
] as const;

export const zContactReplyIntent = z.enum(CONTACT_REPLY_INTENTS);
export const zContactReplyConfidence = z.enum(['low', 'medium', 'high']);

export const zContactTriageResult = z.object({
  classification: zContactTriageClassification,
  reason: z.string().min(1).max(500),
  replyConfidence: zContactReplyConfidence,
  replyIntent: zContactReplyIntent,
  tags: z.array(z.enum(CONTACT_TRIAGE_TAGS)).max(CONTACT_TRIAGE_TAGS.length),
});

export type ContactTriageResult = z.infer<typeof zContactTriageResult>;

export interface ContactNotificationDecision {
  replyToCustomer: boolean;
  notifySupport: boolean;
  routing: 'notify' | 'reply' | 'suppress';
  tags: ContactTriageResult['tags'];
}

export const resolveContactTriage = (
  result: ContactTriageResult
): ContactNotificationDecision => {
  const suppressEmail = ['malicious', 'irrelevant'].includes(
    result.classification
  );
  const replyToCustomer =
    result.classification === 'actionable' &&
    result.replyConfidence === 'high' &&
    result.replyIntent !== 'none';

  return {
    notifySupport: !suppressEmail && !replyToCustomer,
    replyToCustomer,
    routing: suppressEmail ? 'suppress' : replyToCustomer ? 'reply' : 'notify',
    tags: result.classification === 'malicious' ? result.tags : [],
  };
};
