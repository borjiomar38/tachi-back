import { ORPCError } from '@orpc/server';
import { z } from 'zod';

import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { publicProcedure } from '@/server/orpc';
import {
  hashPurchaseTicket,
  PurchaseError,
  zPurchaseTicket,
} from '@/server/payments/purchase-policy';
import { getTokenPurchaseStatus } from '@/server/payments/token-purchase-claim';

export const tokenPurchaseRouter = {
  status: publicProcedure()
    .route({ method: 'POST', path: '/token-purchase/status' })
    .input(z.object({ ticket: zPurchaseTicket() }))
    .handler(async ({ input, context }) => {
      context.resHeaders?.set('Cache-Control', 'no-store');
      const rate = consumeInMemoryRateLimit({
        key: `purchase-status:${hashPurchaseTicket(input.ticket)}`,
        limit: 40,
        windowMs: 60_000,
      });
      if (!rate.allowed) throw new ORPCError('TOO_MANY_REQUESTS');
      try {
        return await getTokenPurchaseStatus(input);
      } catch (error) {
        if (error instanceof PurchaseError)
          throw new ORPCError('BAD_REQUEST', { message: error.code });
        throw error;
      }
    }),
};
