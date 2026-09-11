import i18n from '@/lib/i18n';

import { TokenPurchaseReceipt } from '@/emails/templates/token-purchase-receipt';
import { envClient } from '@/env/client';
import { db } from '@/server/db';
import { sendEmail } from '@/server/email';

export const deliverPurchaseEmails = async (
  input: { purchaseId?: string; limit?: number } = {}
) => {
  if (envClient.VITE_IS_DEMO) return { checked: 0 };
  const now = new Date();
  const purchases = await db.tokenPurchase.findMany({
    where: {
      ...(input.purchaseId ? { id: input.purchaseId } : {}),
      status: 'paid',
      emailSentAt: null,
      payerEmail: { not: null },
      emailNextAttemptAt: { lte: now },
      OR: [{ emailLeaseUntil: null }, { emailLeaseUntil: { lt: now } }],
    },
    take: Math.min(input.limit ?? 10, 25),
    orderBy: { emailNextAttemptAt: 'asc' },
    include: { redeemCode: { select: { code: true } } },
  });
  for (const purchase of purchases) {
    if (!purchase.redeemCode || !purchase.payerEmail) continue;
    const lease = await db.tokenPurchase.updateMany({
      where: {
        id: purchase.id,
        emailSentAt: null,
        OR: [{ emailLeaseUntil: null }, { emailLeaseUntil: { lt: now } }],
      },
      data: {
        emailLeaseUntil: new Date(now.getTime() + 5 * 60_000),
        emailAttempts: { increment: 1 },
      },
    });
    if (lease.count !== 1) continue;
    try {
      const device = purchase.installationId
        ? await db.device.findUnique({
            where: { installationId: purchase.installationId },
            select: { locale: true },
          })
        : null;
      const language = device?.locale?.toLowerCase().startsWith('fr')
        ? 'fr'
        : 'en';
      const t = i18n.getFixedT(language, ['emails', 'common']);
      const delivery = await sendEmail({
        to: purchase.payerEmail,
        subject: t('emails:tokenPurchase.subject', { pack: purchase.packName }),
        template: (
          <TokenPurchaseReceipt
            language={language}
            packName={purchase.packName}
            totalTokens={purchase.totalTokens}
            redeemCode={purchase.redeemCode.code}
          />
        ),
      });
      if (delivery?.rejected?.length)
        throw new Error('email_recipient_rejected');
      await db.tokenPurchase.update({
        where: { id: purchase.id },
        data: {
          emailSentAt: new Date(),
          emailLeaseUntil: null,
          lastEmailError: null,
        },
      });
    } catch {
      const delayMs = Math.min(
        24 * 60 * 60_000,
        60_000 * 2 ** Math.min(purchase.emailAttempts, 10)
      );
      await db.tokenPurchase.update({
        where: { id: purchase.id },
        data: {
          emailLeaseUntil: null,
          emailNextAttemptAt: new Date(Date.now() + delayMs),
          lastEmailError: 'email_delivery_failed',
        },
      });
    }
  }
  return { checked: purchases.length };
};
