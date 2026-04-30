import { db } from '@/server/db';

export async function getAvailableLicenseTokenBalance(
  input: {
    licenseId: string;
  },
  deps: {
    dbClient?: typeof db;
  } = {}
) {
  const dbClient = deps.dbClient ?? db;
  const tokenBalance = await dbClient.tokenLedger.aggregate({
    where: {
      licenseId: input.licenseId,
      OR: [
        {
          status: 'posted',
        },
        {
          status: 'pending',
          type: {
            not: 'job_reserve',
          },
        },
      ],
    },
    _sum: {
      deltaTokens: true,
    },
  });

  return tokenBalance._sum.deltaTokens ?? 0;
}
