import { DEFAULT_LANGUAGE_KEY } from '@/lib/i18n/constants';

import TemplateFreeTrialRedeemCode from '@/emails/templates/free-trial-redeem-code';
import { sendEmail } from '@/server/email';

export async function sendFreeTrialRedeemCodeEmail(input: {
  redeemCode: string;
  to: string;
  tokenAmount: number;
}) {
  return sendEmail({
    subject: `Your ${input.tokenAmount}-token Nayovi free trial code`,
    template: (
      <TemplateFreeTrialRedeemCode
        language={DEFAULT_LANGUAGE_KEY}
        redeemCode={input.redeemCode}
        tokenAmount={input.tokenAmount}
      />
    ),
    to: input.to,
  });
}
