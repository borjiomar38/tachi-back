import { waitUntil } from '@vercel/functions';

import { reviewFreeTrialEmailRisk } from '@/server/licenses/free-trial-email-risk';
import { getFreeTrialRuntimeConfig } from '@/server/licenses/free-trial-settings';
import { logger } from '@/server/logger';

export function scheduleFreeTrialEmailRiskReview(claimId: string | null) {
  if (!claimId) {
    return;
  }

  waitUntil(
    getFreeTrialRuntimeConfig()
      .then((runtimeConfig) => {
        if (!runtimeConfig.current.emailRiskReviewEnabled) {
          return null;
        }

        return reviewFreeTrialEmailRisk({ claimId });
      })
      .catch((error) => {
        logger.error({
          claimId,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          message: 'Asynchronous free trial email review failed',
          type: 'free_trial_email_review_error',
        });
      })
  );
}
