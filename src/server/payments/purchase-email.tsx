import { DEFAULT_LANGUAGE_KEY } from '@/lib/i18n/constants';

import TemplatePurchaseReceipt from '@/emails/templates/purchase-receipt';
import { sendEmail } from '@/server/email';

export async function sendPurchaseReceiptEmail(input: {
  redeemCode: string;
  to: string;
  tokenPackName: string;
  totalTokens: number;
}) {
  return sendEmail({
    subject: `Your ${input.tokenPackName} activation code`,
    template: (
      <TemplatePurchaseReceipt
        language={DEFAULT_LANGUAGE_KEY}
        packName={input.tokenPackName}
        redeemCode={input.redeemCode}
        totalTokens={input.totalTokens}
      />
    ),
    to: input.to,
  });
}
