import type { Page } from '@playwright/test';
import { expect, test } from 'e2e/utils';
import { ADMIN_FILE } from 'e2e/utils/constants';

import { PrismaClient } from '@/server/db/generated/client';

const db = new PrismaClient();

const fixture = {
  claimId: 'e2e-free-trial-claim',
  deviceFingerprintHash: 'e2e-device-fingerprint-hash-admin',
  deviceId: 'e2e-free-trial-device',
  email: 'free-trial-admin-e2e@example.com',
  installationId: 'e2e-installation-free-trial',
  ipAddress: '198.51.100.44',
  jobId: 'e2e-free-trial-job',
  ledgerCreditId: 'e2e-free-trial-credit',
  ledgerSpendId: 'e2e-free-trial-spend',
  licenseId: 'e2e-free-trial-license',
  licenseKey: 'E2E-FREE-TRIAL-LICENSE',
  redeemCode: 'TB-FREE-E2E-ADMIN',
  redeemCodeId: 'e2e-free-trial-redeem',
};

test.describe('Free-trial tracking backoffice', () => {
  test.use({ storageState: ADMIN_FILE });

  test.beforeAll(async () => {
    await cleanupFixture();
    await db.device.create({
      data: {
        id: fixture.deviceId,
        installationId: fixture.installationId,
        lastIpAddress: fixture.ipAddress,
        lastSeenAt: new Date('2026-05-12T10:00:00.000Z'),
        status: 'active',
      },
    });
    await db.license.create({
      data: {
        id: fixture.licenseId,
        key: fixture.licenseKey,
        ownerEmail: fixture.email,
        status: 'active',
      },
    });
    await db.redeemCode.create({
      data: {
        code: fixture.redeemCode,
        id: fixture.redeemCodeId,
        licenseId: fixture.licenseId,
        redeemedAt: new Date('2026-05-12T09:00:00.000Z'),
        redeemedByDeviceId: fixture.deviceId,
        status: 'redeemed',
      },
    });
    await db.freeTrialClaim.create({
      data: {
        deviceFingerprintHash: fixture.deviceFingerprintHash,
        email: fixture.email,
        emailNormalized: fixture.email,
        id: fixture.claimId,
        installationId: fixture.installationId,
        ipAddress: fixture.ipAddress,
        licenseId: fixture.licenseId,
        redeemCodeId: fixture.redeemCodeId,
        tokenAmount: 100,
        identities: {
          createMany: {
            data: [
              { kind: 'email', value: fixture.email },
              { kind: 'installation', value: fixture.installationId },
              { kind: 'ip_address', value: fixture.ipAddress },
              {
                kind: 'device_fingerprint',
                value: fixture.deviceFingerprintHash,
              },
            ],
          },
        },
      },
    });
    await db.tokenLedger.createMany({
      data: [
        {
          deltaTokens: 100,
          description: 'E2E free-trial credit',
          id: fixture.ledgerCreditId,
          licenseId: fixture.licenseId,
          redeemCodeId: fixture.redeemCodeId,
          status: 'posted',
          type: 'redeem_credit',
        },
        {
          deltaTokens: -35,
          description: 'E2E chapter spend',
          deviceId: fixture.deviceId,
          id: fixture.ledgerSpendId,
          licenseId: fixture.licenseId,
          status: 'posted',
          type: 'job_spend',
        },
      ],
    });
    await db.translationJob.create({
      data: {
        completedAt: new Date('2026-05-12T10:05:00.000Z'),
        deviceId: fixture.deviceId,
        id: fixture.jobId,
        licenseId: fixture.licenseId,
        pageCount: 7,
        sourceLanguage: 'ja',
        spentTokens: 35,
        status: 'completed',
        targetLanguage: 'en',
      },
    });
  });

  test.afterAll(async () => {
    await cleanupFixture();
    await db.$disconnect();
  });

  test('shows searchable identity, network, device, ledger, and job signals', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.to('/manager/free-trials');
    await expect(
      page.getByRole('heading', { name: 'Free trials' })
    ).toBeVisible();
    await expect(getFixtureClaimLink(page)).toBeVisible();
    await expect(page.getByText('65 / 100')).toBeVisible();
    await expect(page.getByText(fixture.ipAddress)).toBeVisible();
    await expect(page.getByText('1 IP signals')).toBeVisible();

    await page
      .getByPlaceholder(
        'Search email, install, IP, fingerprint, redeem, license'
      )
      .fill(fixture.deviceFingerprintHash);
    await expect(getFixtureClaimLink(page)).toBeVisible();

    await getFixtureClaimLink(page).click();
    await expect(page.getByText('Free-trial claim')).toBeVisible();
    await expect(page.getByText(fixture.installationId).first()).toBeVisible();
    await expect(
      page.getByText(fixture.deviceFingerprintHash).first()
    ).toBeVisible();
    await expect(page.getByText('Network history').first()).toBeVisible();
    await expect(page.getByText('Token ledger').first()).toBeVisible();
    await expect(page.getByText('E2E chapter spend')).toBeVisible();
    await expect(page.getByText('Recent jobs').first()).toBeVisible();
    await expect(page.getByText('completed')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.to('/manager/free-trials');
    await expect(
      page.getByRole('heading', { name: 'Free trials' })
    ).toBeVisible();
    await expect(getFixtureClaimLink(page)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Search free trials' })
    ).toBeVisible();
    await expect
      .poll(() =>
        page
          .locator('body')
          .evaluate((body) => body.scrollWidth <= body.clientWidth + 1)
      )
      .toBe(true);
  });
});

async function cleanupFixture() {
  await db.tokenLedger.deleteMany({
    where: {
      id: {
        in: [fixture.ledgerCreditId, fixture.ledgerSpendId],
      },
    },
  });
  await db.translationJob.deleteMany({
    where: {
      id: fixture.jobId,
    },
  });
  await db.freeTrialIdentity.deleteMany({
    where: {
      value: {
        in: [
          fixture.email,
          fixture.installationId,
          fixture.ipAddress,
          fixture.deviceFingerprintHash,
        ],
      },
    },
  });
  await db.freeTrialClaim.deleteMany({
    where: {
      id: fixture.claimId,
    },
  });
  await db.redeemCode.deleteMany({
    where: {
      id: fixture.redeemCodeId,
    },
  });
  await db.license.deleteMany({
    where: {
      id: fixture.licenseId,
    },
  });
  await db.device.deleteMany({
    where: {
      id: fixture.deviceId,
    },
  });
}

function getFixtureClaimLink(page: Page) {
  return page.getByRole('link', { name: /free-trial-admin-e2e@example/ });
}
