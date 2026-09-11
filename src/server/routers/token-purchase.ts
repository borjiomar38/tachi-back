import { ORPCError } from '@orpc/server';
import { z } from 'zod';

import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';
import { publicProcedure } from '@/server/orpc';
import {
  hashPurchaseTicket,
  PurchaseError,
  zPurchaseTicket,
} from '@/server/payments/purchase-policy';
import { getTokenConsumption } from '@/server/payments/token-consumption';
import { getTokenPurchaseStatus } from '@/server/payments/token-purchase-claim';

export const tokenPurchaseRouter = {
  consumption: publicProcedure()
    .route({ method: 'GET', path: '/token-purchase/consumption' })
    .handler(({ context }) => {
      context.resHeaders?.set('Cache-Control', 'no-store');
      return getTokenConsumption();
    }),
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
