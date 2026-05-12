import { db } from '@/server/db';

type PaidEntitlementDbClient = Pick<typeof db, 'order'>;

export async function hasPaidLicenseEntitlement(
  input: {
    licenseId: string;
    now: Date;
  },
  deps: {
    dbClient?: PaidEntitlementDbClient;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;
  const paidOrder = await dbClient.order.findFirst({
    where: {
      licenseId: input.licenseId,
      paidAt: {
        not: null,
      },
      status: 'paid',
      OR: [
        {
          lsSubscriptionId: null,
        },
        {
          billingPeriodEnd: null,
        },
        {
          billingPeriodEnd: {
            gt: input.now,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(paidOrder);
}
