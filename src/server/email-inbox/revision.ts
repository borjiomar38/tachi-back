import { db } from '@/server/db';

export const getEmailInboxRevision = async () => {
  const [messages, threads] = await Promise.all([
    db.contactConversationMessage.aggregate({
      _count: { _all: true },
      _max: { updatedAt: true },
      where: {
        OR: [{ source: 'email' }, { direction: 'outbound' }],
      },
    }),
    db.contactMessage.aggregate({
      _count: { _all: true },
      _max: { updatedAt: true },
      where: {
        conversationMessages: {
          some: { direction: 'inbound', source: 'email' },
        },
      },
    }),
  ]);

  return [
    messages._count._all,
    messages._max.updatedAt?.getTime() ?? 0,
    threads._count._all,
    threads._max.updatedAt?.getTime() ?? 0,
  ].join(':');
};
