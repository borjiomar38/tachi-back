import { zPublicContactMessageInput } from '@/server/contact/schema';
import { db } from '@/server/db';

export async function createPublicContactMessage(
  input: unknown,
  metadata?: {
    ipAddress?: string | null;
    userAgent?: string | null;
  }
) {
  const data = zPublicContactMessageInput.parse(input);

  return await db.contactMessage.create({
    data: {
      email: data.email,
      ipAddress: metadata?.ipAddress ?? null,
      message: data.message,
      name: data.name,
      source: 'public_landing_form',
      subject: data.subject,
      userAgent: metadata?.userAgent ?? null,
    },
    select: {
      id: true,
    },
  });
}
