import { zPublicContactMessageInput } from '@/server/contact/schema';
import { getContactFormMessageId } from '@/server/contact/thread-policy';
import { db } from '@/server/db';

export async function createPublicContactMessage(
  input: unknown,
  metadata?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const data = zPublicContactMessageInput.parse(input);

  return await db.$transaction(async (tx) => {
    const contact = await tx.contactMessage.create({
      data: {
        email: data.email,
        ipAddress: metadata?.ipAddress ?? null,
        message: data.message,
        name: data.name,
        source: 'public_landing_form:triage_pending',
        subject: data.subject,
        userAgent: metadata?.userAgent ?? null,
      },
      select: {
        id: true,
      },
    });

    await tx.contactConversationMessage.create({
      data: {
        automationStatus: 'pending',
        bodyText: data.message,
        contactId: contact.id,
        deliveryStatus: 'received',
        direction: 'inbound',
        messageId: getContactFormMessageId(contact.id),
        receivedAt: new Date(),
        recipientEmail: 'contact@nayovi.com',
        references: [],
        senderEmail: data.email,
        source: 'contact_form',
        subject: data.subject,
      },
    });

    return contact;
  });
}
