export interface ContactThreadCandidate {
  email: string;
  id: string;
  messageIds: string[];
  subject: string;
}

const sanitizeMessageIdPart = (value: string) =>
  value.replaceAll(/[^a-zA-Z0-9._-]/g, '-');

export const getContactFormMessageId = (contactId: string) =>
  `<contact-form-${sanitizeMessageIdPart(contactId)}@nayovi.com>`;

export const getContactReplyMessageId = (
  contactId: string,
  conversationMessageId: string
) =>
  `<contact-reply-${sanitizeMessageIdPart(contactId)}-${sanitizeMessageIdPart(conversationMessageId)}@nayovi.com>`;

const MESSAGE_ID_PATTERN = /<?[^<>\s]+@[^<>\s]+>?/g;

export const normalizeContactMessageId = (value: string) => {
  const normalized = value.trim().replace(/^<|>$/g, '');
  return normalized ? `<${normalized.toLowerCase()}>` : '';
};

export const getContactReferenceMessageIds = (
  inReplyTo: string | null | undefined,
  references: string[]
) =>
  Array.from(
    new Set(
      [inReplyTo, ...references]
        .filter((value): value is string => Boolean(value))
        .flatMap((value) => value.match(MESSAGE_ID_PATTERN) ?? [])
        .map(normalizeContactMessageId)
        .filter(Boolean)
    )
  );

export const normalizeContactSubject = (subject: string) =>
  subject
    .trim()
    .replace(/^\s*((re|fw|fwd|aw|sv)\s*:\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

export const extractLatestContactReply = (text: string) => {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.startsWith('>') ||
      /^-{2,}\s*(original message|message d'origine)\s*-{2,}$/i.test(trimmed) ||
      /^(on .+ wrote:|le .+ a écrit\s*:|from\s*:|de\s*:)/i.test(trimmed)
    ) {
      break;
    }
    kept.push(line);
  }

  return kept.join('\n').trim().slice(0, 4000);
};

export const resolveContactThreadCandidate = (input: {
  candidates: ContactThreadCandidate[];
  inReplyTo?: string | null;
  references?: string[];
  senderEmail: string;
  subject: string;
}) => {
  const referenceIds = getContactReferenceMessageIds(
    input.inReplyTo,
    input.references ?? []
  );

  if (referenceIds.length) {
    const referenceMatches = input.candidates.filter((candidate) =>
      candidate.messageIds.some((messageId) =>
        referenceIds.includes(normalizeContactMessageId(messageId))
      )
    );
    if (referenceMatches.length === 1) return referenceMatches[0];
    if (referenceMatches.length > 1) return null;
  }

  const normalizedSender = input.senderEmail.trim().toLowerCase();
  const normalizedSubject = normalizeContactSubject(input.subject);
  const fallbackMatches = input.candidates.filter(
    (candidate) =>
      candidate.email.trim().toLowerCase() === normalizedSender &&
      normalizeContactSubject(candidate.subject) === normalizedSubject
  );

  return fallbackMatches.length === 1 ? fallbackMatches[0] : null;
};
