import { envServer } from '@/env/server';
import { db } from '@/server/db';

import { emphasis } from './_utils';

const DEMO_USERS = {
  alex: 'alex.reader@demo.local',
  mina: 'mina.failed@demo.local',
  nora: 'nora.unredeemed@demo.local',
} as const;

const DEMO_LICENSE_KEYS = {
  alex: 'lic_demo_alex_active',
  mina: 'lic_demo_mina_failed',
  nora: 'lic_demo_unredeemed',
} as const;

const DEMO_INSTALLATIONS = {
  alexActive: 'inst_demo_pixel8_alex',
  alexOld: 'inst_demo_fold_alex_old',
  minaActive: 'inst_demo_s23_mina',
} as const;

const DEMO_REDEEM_CODES = {
  alexCurrent: 'DEMO-ALEX-PRO-001',
  alexOld: 'DEMO-ALEX-OLD-002',
  minaCurrent: 'DEMO-MINA-STARTER-001',
  noraAvailable: 'DEMO-NORA-POWER-001',
} as const;

const DEMO_TAG = 'backoffice-demo-v1';

function minutesAgo(value: number) {
  return new Date(Date.now() - value * 60 * 1000);
}

function hoursAgo(value: number) {
  return new Date(Date.now() - value * 60 * 60 * 1000);
}

function daysAgo(value: number) {
  return new Date(Date.now() - value * 24 * 60 * 60 * 1000);
}

export async function createBackofficeDemoData() {
  console.log('⏳ Seeding backoffice demo data');

  const [admin, support, starterPack, proPack, powerPack] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { email: 'admin@tachi-back.local' },
      select: { id: true },
    }),
    db.user.findUniqueOrThrow({
      where: { email: 'support@tachi-back.local' },
      select: { id: true },
    }),
    db.tokenPack.findUniqueOrThrow({
      where: { key: 'starter' },
      select: { id: true },
    }),
    db.tokenPack.findUniqueOrThrow({
      where: { key: 'pro' },
      select: { id: true },
    }),
    db.tokenPack.findUniqueOrThrow({
      where: { key: 'power' },
      select: { id: true },
    }),
  ]);

  const alexLicense = await db.license.upsert({
    where: {
      key: DEMO_LICENSE_KEYS.alex,
    },
    create: {
      id: 'seed_license_alex_active',
      fulfillmentKey: 'fulfill_demo_alex_active',
      key: DEMO_LICENSE_KEYS.alex,
      ownerEmail: DEMO_USERS.alex,
      status: 'active',
      deviceLimit: 2,
      notes:
        'Seeded backoffice demo: active customer with paid order, redeemed code, completed job, and in-flight job.',
      createdAt: daysAgo(14),
      activatedAt: daysAgo(10),
    },
    update: {
      fulfillmentKey: 'fulfill_demo_alex_active',
      ownerEmail: DEMO_USERS.alex,
      status: 'active',
      deviceLimit: 2,
      notes:
        'Seeded backoffice demo: active customer with paid order, redeemed code, completed job, and in-flight job.',
      activatedAt: daysAgo(10),
      revokedAt: null,
    },
    select: { id: true },
  });

  const minaLicense = await db.license.upsert({
    where: {
      key: DEMO_LICENSE_KEYS.mina,
    },
    create: {
      id: 'seed_license_mina_failed',
      fulfillmentKey: 'fulfill_demo_mina_failed',
      key: DEMO_LICENSE_KEYS.mina,
      ownerEmail: DEMO_USERS.mina,
      status: 'active',
      deviceLimit: 1,
      notes:
        'Seeded backoffice demo: failed provider run plus manual credit for support recovery.',
      createdAt: daysAgo(6),
      activatedAt: daysAgo(5),
    },
    update: {
      fulfillmentKey: 'fulfill_demo_mina_failed',
      ownerEmail: DEMO_USERS.mina,
      status: 'active',
      deviceLimit: 1,
      notes:
        'Seeded backoffice demo: failed provider run plus manual credit for support recovery.',
      activatedAt: daysAgo(5),
      revokedAt: null,
    },
    select: { id: true },
  });

  const noraLicense = await db.license.upsert({
    where: {
      key: DEMO_LICENSE_KEYS.nora,
    },
    create: {
      id: 'seed_license_nora_unredeemed',
      fulfillmentKey: 'fulfill_demo_nora_unredeemed',
      key: DEMO_LICENSE_KEYS.nora,
      ownerEmail: DEMO_USERS.nora,
      status: 'pending',
      deviceLimit: 1,
      notes:
        'Seeded backoffice demo: paid order with available redeem code but no activated device yet.',
      createdAt: daysAgo(1),
    },
    update: {
      fulfillmentKey: 'fulfill_demo_nora_unredeemed',
      ownerEmail: DEMO_USERS.nora,
      status: 'pending',
      deviceLimit: 1,
      notes:
        'Seeded backoffice demo: paid order with available redeem code but no activated device yet.',
      activatedAt: null,
      revokedAt: null,
    },
    select: { id: true },
  });

  const alexActiveDevice = await db.device.upsert({
    where: {
      installationId: DEMO_INSTALLATIONS.alexActive,
    },
    create: {
      id: 'seed_device_alex_active',
      installationId: DEMO_INSTALLATIONS.alexActive,
      platform: 'android',
      status: 'active',
      appVersion: '1.0.0-dev',
      appBuild: '2026.03.20.1',
      locale: 'en-US',
      lastSeenAt: minutesAgo(6),
      lastIpAddress: '10.0.0.21',
      metadata: {
        manufacturer: 'Google',
        model: 'Pixel 8 Pro',
        androidVersion: '15',
        hostedEngine: 'Tachiyomi Back [TOKENS]',
        seedTag: DEMO_TAG,
      },
      createdAt: daysAgo(10),
    },
    update: {
      status: 'active',
      appVersion: '1.0.0-dev',
      appBuild: '2026.03.20.1',
      locale: 'en-US',
      lastSeenAt: minutesAgo(6),
      lastIpAddress: '10.0.0.21',
      metadata: {
        manufacturer: 'Google',
        model: 'Pixel 8 Pro',
        androidVersion: '15',
        hostedEngine: 'Tachiyomi Back [TOKENS]',
        seedTag: DEMO_TAG,
      },
    },
    select: { id: true },
  });

  const alexOldDevice = await db.device.upsert({
    where: {
      installationId: DEMO_INSTALLATIONS.alexOld,
    },
    create: {
      id: 'seed_device_alex_old',
      installationId: DEMO_INSTALLATIONS.alexOld,
      platform: 'android',
      status: 'revoked',
      appVersion: '0.9.7-dev',
      appBuild: '2026.02.11.4',
      locale: 'en-US',
      lastSeenAt: daysAgo(2),
      lastIpAddress: '10.0.0.18',
      metadata: {
        manufacturer: 'Samsung',
        model: 'Galaxy Z Fold',
        androidVersion: '14',
        revokeReason: 'Customer moved to a new device',
        seedTag: DEMO_TAG,
      },
      createdAt: daysAgo(22),
    },
    update: {
      status: 'revoked',
      appVersion: '0.9.7-dev',
      appBuild: '2026.02.11.4',
      locale: 'en-US',
      lastSeenAt: daysAgo(2),
      lastIpAddress: '10.0.0.18',
      metadata: {
        manufacturer: 'Samsung',
        model: 'Galaxy Z Fold',
        androidVersion: '14',
        revokeReason: 'Customer moved to a new device',
        seedTag: DEMO_TAG,
      },
    },
    select: { id: true },
  });

  const minaActiveDevice = await db.device.upsert({
    where: {
      installationId: DEMO_INSTALLATIONS.minaActive,
    },
    create: {
      id: 'seed_device_mina_active',
      installationId: DEMO_INSTALLATIONS.minaActive,
      platform: 'android',
      status: 'active',
      appVersion: '1.0.0-dev',
      appBuild: '2026.03.20.1',
      locale: 'fr-FR',
      lastSeenAt: minutesAgo(48),
      lastIpAddress: '10.0.0.33',
      metadata: {
        manufacturer: 'Samsung',
        model: 'Galaxy S23',
        androidVersion: '15',
        preferredTargetLanguage: 'en',
        seedTag: DEMO_TAG,
      },
      createdAt: daysAgo(5),
    },
    update: {
      status: 'active',
      appVersion: '1.0.0-dev',
      appBuild: '2026.03.20.1',
      locale: 'fr-FR',
      lastSeenAt: minutesAgo(48),
      lastIpAddress: '10.0.0.33',
      metadata: {
        manufacturer: 'Samsung',
        model: 'Galaxy S23',
        androidVersion: '15',
        preferredTargetLanguage: 'en',
        seedTag: DEMO_TAG,
      },
    },
    select: { id: true },
  });

  const licenseIds = [alexLicense.id, minaLicense.id, noraLicense.id];
  const deviceIds = [
    alexActiveDevice.id,
    alexOldDevice.id,
    minaActiveDevice.id,
  ];
  const orderIds = [
    'seed_order_alex_pro_paid',
    'seed_order_mina_starter_paid',
    'seed_order_nora_power_paid',
  ];
  const redeemCodeIds = [
    'seed_redeem_alex_current',
    'seed_redeem_alex_old',
    'seed_redeem_mina_current',
    'seed_redeem_nora_available',
  ];
  const jobIds = [
    'seed_job_alex_completed',
    'seed_job_alex_processing',
    'seed_job_mina_failed',
  ];
  const webhookEventIds = [
    'seed_webhook_event_alex_paid',
    'seed_webhook_event_mina_paid',
    'seed_webhook_event_nora_paid',
  ];

  await db.$transaction(
    async (tx) => {
      await tx.tokenLedger.deleteMany({
        where: {
          licenseId: {
            in: licenseIds,
          },
        },
      });

      await tx.providerUsage.deleteMany({
        where: {
          jobId: {
            in: jobIds,
          },
        },
      });

      await tx.jobAsset.deleteMany({
        where: {
          jobId: {
            in: jobIds,
          },
        },
      });

      await tx.translationJob.deleteMany({
        where: {
          id: {
            in: jobIds,
          },
        },
      });

      await tx.mobileSession.deleteMany({
        where: {
          licenseId: {
            in: licenseIds,
          },
        },
      });

      await tx.licenseDevice.deleteMany({
        where: {
          OR: [
            {
              licenseId: {
                in: licenseIds,
              },
            },
            {
              deviceId: {
                in: deviceIds,
              },
            },
          ],
        },
      });

      await tx.webhookEvent.deleteMany({
        where: {
          id: {
            in: webhookEventIds,
          },
        },
      });

      await tx.redeemCode.deleteMany({
        where: {
          OR: [
            {
              id: {
                in: redeemCodeIds,
              },
            },
            {
              licenseId: {
                in: licenseIds,
              },
            },
          ],
        },
      });

      await tx.order.deleteMany({
        where: {
          id: {
            in: orderIds,
          },
        },
      });

      await tx.order.create({
        data: {
          id: 'seed_order_alex_pro_paid',
          provider: 'lemonsqueezy',
          status: 'paid',
          tokenPackId: proPack.id,
          licenseId: alexLicense.id,
          payerEmail: DEMO_USERS.alex,
          currency: 'usd',
          amountSubtotalCents: 3999,
          amountDiscountCents: 0,
          amountTotalCents: 3999,
          lsOrderId: 'ls_order_demo_alex_pro_001',
          lsCustomerId: 'ls_cus_demo_alex_001',
          paidAt: daysAgo(10),
          rawPayload: {
            seedTag: DEMO_TAG,
            tokenPackKey: 'pro',
          },
          createdAt: daysAgo(10),
        },
      });

      await tx.order.create({
        data: {
          id: 'seed_order_mina_starter_paid',
          provider: 'lemonsqueezy',
          status: 'paid',
          tokenPackId: starterPack.id,
          licenseId: minaLicense.id,
          payerEmail: DEMO_USERS.mina,
          currency: 'usd',
          amountSubtotalCents: 999,
          amountDiscountCents: 0,
          amountTotalCents: 999,
          lsOrderId: 'ls_order_demo_mina_starter_001',
          lsCustomerId: 'ls_cus_demo_mina_001',
          paidAt: daysAgo(5),
          rawPayload: {
            seedTag: DEMO_TAG,
            tokenPackKey: 'starter',
          },
          createdAt: daysAgo(5),
        },
      });

      await tx.order.create({
        data: {
          id: 'seed_order_nora_power_paid',
          provider: 'lemonsqueezy',
          status: 'paid',
          tokenPackId: powerPack.id,
          licenseId: noraLicense.id,
          payerEmail: DEMO_USERS.nora,
          currency: 'usd',
          amountSubtotalCents: 9999,
          amountDiscountCents: 0,
          amountTotalCents: 9999,
          lsOrderId: 'ls_order_demo_nora_power_001',
          lsCustomerId: 'ls_cus_demo_nora_001',
          paidAt: hoursAgo(20),
          rawPayload: {
            seedTag: DEMO_TAG,
            tokenPackKey: 'power',
          },
          createdAt: hoursAgo(20),
        },
      });

      await tx.webhookEvent.createMany({
        data: [
          {
            id: 'seed_webhook_event_alex_paid',
            lsEventId: 'evt_demo_alex_order_001',
            type: 'order_created',
            status: 'processed',
            orderId: 'seed_order_alex_pro_paid',
            payload: {
              seedTag: DEMO_TAG,
              object: 'event',
              orderId: 'seed_order_alex_pro_paid',
            },
            processedAt: daysAgo(10),
            createdAt: daysAgo(10),
          },
          {
            id: 'seed_webhook_event_mina_paid',
            lsEventId: 'evt_demo_mina_order_001',
            type: 'order_created',
            status: 'processed',
            orderId: 'seed_order_mina_starter_paid',
            payload: {
              seedTag: DEMO_TAG,
              object: 'event',
              orderId: 'seed_order_mina_starter_paid',
            },
            processedAt: daysAgo(5),
            createdAt: daysAgo(5),
          },
          {
            id: 'seed_webhook_event_nora_paid',
            lsEventId: 'evt_demo_nora_order_001',
            type: 'order_created',
            status: 'processed',
            orderId: 'seed_order_nora_power_paid',
            payload: {
              seedTag: DEMO_TAG,
              object: 'event',
              orderId: 'seed_order_nora_power_paid',
            },
            processedAt: hoursAgo(20),
            createdAt: hoursAgo(20),
          },
        ],
      });

      await tx.redeemCode.createMany({
        data: [
          {
            id: 'seed_redeem_alex_current',
            code: DEMO_REDEEM_CODES.alexCurrent,
            fulfillmentKey: 'rc_demo_alex_current',
            licenseId: alexLicense.id,
            orderId: 'seed_order_alex_pro_paid',
            status: 'redeemed',
            createdByUserId: support.id,
            redeemedByDeviceId: alexActiveDevice.id,
            expiresAt: daysAgo(-20),
            redeemedAt: daysAgo(10),
            metadata: {
              seedTag: DEMO_TAG,
              purpose: 'initial activation',
            },
            createdAt: daysAgo(10),
          },
          {
            id: 'seed_redeem_alex_old',
            code: DEMO_REDEEM_CODES.alexOld,
            fulfillmentKey: 'rc_demo_alex_old',
            licenseId: alexLicense.id,
            orderId: 'seed_order_alex_pro_paid',
            status: 'canceled',
            createdByUserId: admin.id,
            redeemedByDeviceId: null,
            expiresAt: daysAgo(1),
            redeemedAt: null,
            metadata: {
              seedTag: DEMO_TAG,
              purpose: 'superseded recovery code',
            },
            createdAt: daysAgo(4),
          },
          {
            id: 'seed_redeem_mina_current',
            code: DEMO_REDEEM_CODES.minaCurrent,
            fulfillmentKey: 'rc_demo_mina_current',
            licenseId: minaLicense.id,
            orderId: 'seed_order_mina_starter_paid',
            status: 'redeemed',
            createdByUserId: support.id,
            redeemedByDeviceId: minaActiveDevice.id,
            expiresAt: daysAgo(-14),
            redeemedAt: daysAgo(5),
            metadata: {
              seedTag: DEMO_TAG,
              purpose: 'initial activation',
            },
            createdAt: daysAgo(5),
          },
          {
            id: 'seed_redeem_nora_available',
            code: DEMO_REDEEM_CODES.noraAvailable,
            fulfillmentKey: 'rc_demo_nora_available',
            licenseId: noraLicense.id,
            orderId: 'seed_order_nora_power_paid',
            status: 'available',
            createdByUserId: admin.id,
            redeemedByDeviceId: null,
            expiresAt: daysAgo(-29),
            redeemedAt: null,
            metadata: {
              seedTag: DEMO_TAG,
              purpose: 'awaiting first redeem',
            },
            createdAt: hoursAgo(20),
          },
        ],
      });

      await tx.licenseDevice.createMany({
        data: [
          {
            id: 'seed_binding_alex_active',
            licenseId: alexLicense.id,
            deviceId: alexActiveDevice.id,
            status: 'active',
            boundAt: daysAgo(10),
            createdAt: daysAgo(10),
          },
          {
            id: 'seed_binding_alex_old',
            licenseId: alexLicense.id,
            deviceId: alexOldDevice.id,
            status: 'released',
            boundAt: daysAgo(22),
            unboundAt: daysAgo(2),
            createdAt: daysAgo(22),
          },
          {
            id: 'seed_binding_mina_active',
            licenseId: minaLicense.id,
            deviceId: minaActiveDevice.id,
            status: 'active',
            boundAt: daysAgo(5),
            createdAt: daysAgo(5),
          },
        ],
      });

      await tx.mobileSession.createMany({
        data: [
          {
            id: 'seed_mobile_session_alex',
            deviceId: alexActiveDevice.id,
            licenseId: alexLicense.id,
            refreshTokenHash: 'seed_refresh_hash_alex_active_001',
            expiresAt: daysAgo(-25),
            lastUsedAt: minutesAgo(6),
            lastRefreshedAt: minutesAgo(20),
            lastIpAddress: '10.0.0.21',
            userAgent: 'TachiyomiAT/1.0.0-dev',
            appVersion: '1.0.0-dev',
            appBuild: '2026.03.20.1',
            metadata: {
              seedTag: DEMO_TAG,
              sessionState: 'active',
            },
            createdAt: daysAgo(10),
          },
          {
            id: 'seed_mobile_session_mina',
            deviceId: minaActiveDevice.id,
            licenseId: minaLicense.id,
            refreshTokenHash: 'seed_refresh_hash_mina_active_001',
            expiresAt: daysAgo(-25),
            lastUsedAt: minutesAgo(48),
            lastRefreshedAt: hoursAgo(4),
            lastIpAddress: '10.0.0.33',
            userAgent: 'TachiyomiAT/1.0.0-dev',
            appVersion: '1.0.0-dev',
            appBuild: '2026.03.20.1',
            metadata: {
              seedTag: DEMO_TAG,
              sessionState: 'active',
            },
            createdAt: daysAgo(5),
          },
        ],
      });

      await tx.translationJob.createMany({
        data: [
          {
            id: 'seed_job_alex_completed',
            licenseId: alexLicense.id,
            deviceId: alexActiveDevice.id,
            status: 'completed',
            sourceLanguage: 'ja',
            targetLanguage: 'ar',
            pageCount: 4,
            requestedOcrProvider: 'google_cloud_vision',
            requestedTranslationProvider: 'gemini',
            resolvedOcrProvider: 'google_cloud_vision',
            resolvedTranslationProvider: 'gemini',
            reservedTokens: 20,
            spentTokens: 20,
            uploadCompletedAt: hoursAgo(3),
            queuedAt: hoursAgo(2.9),
            startedAt: hoursAgo(2.8),
            completedAt: hoursAgo(2.6),
            expiresAt: daysAgo(-1),
            errorCode: null,
            errorMessage: null,
            resultPayloadVersion: '2026-03-20.v1',
            resultSummary: {
              seedTag: DEMO_TAG,
              pageOrder: [
                'chapter_031_page_001.png',
                'chapter_031_page_002.png',
                'chapter_031_page_003.png',
                'chapter_031_page_004.png',
              ],
              translatorType: 'gemini',
            },
            createdAt: hoursAgo(3.2),
          },
          {
            id: 'seed_job_alex_processing',
            licenseId: alexLicense.id,
            deviceId: alexActiveDevice.id,
            status: 'processing',
            sourceLanguage: 'ja',
            targetLanguage: 'fr',
            pageCount: 3,
            requestedOcrProvider: 'google_cloud_vision',
            requestedTranslationProvider: 'openai',
            resolvedOcrProvider: 'google_cloud_vision',
            resolvedTranslationProvider: 'openai',
            reservedTokens: 15,
            spentTokens: 0,
            uploadCompletedAt: minutesAgo(32),
            queuedAt: minutesAgo(30),
            startedAt: minutesAgo(24),
            completedAt: null,
            failedAt: null,
            expiresAt: null,
            errorCode: null,
            errorMessage: null,
            resultPayloadVersion: null,
            resultSummary: {
              seedTag: DEMO_TAG,
              stage: 'ocr_complete_translation_running',
            },
            createdAt: minutesAgo(40),
          },
          {
            id: 'seed_job_mina_failed',
            licenseId: minaLicense.id,
            deviceId: minaActiveDevice.id,
            status: 'failed',
            sourceLanguage: 'ja',
            targetLanguage: 'en',
            pageCount: 5,
            requestedOcrProvider: 'google_cloud_vision',
            requestedTranslationProvider: 'anthropic',
            resolvedOcrProvider: 'google_cloud_vision',
            resolvedTranslationProvider: 'anthropic',
            reservedTokens: 25,
            spentTokens: 0,
            uploadCompletedAt: hoursAgo(1.4),
            queuedAt: hoursAgo(1.35),
            startedAt: hoursAgo(1.3),
            completedAt: null,
            failedAt: hoursAgo(1.1),
            expiresAt: null,
            errorCode: 'provider_timeout',
            errorMessage: 'Anthropic request timed out after 60000 ms',
            resultPayloadVersion: null,
            resultSummary: {
              seedTag: DEMO_TAG,
              stage: 'translation_failed',
            },
            createdAt: hoursAgo(1.5),
          },
        ],
      });

      await tx.jobAsset.createMany({
        data: [
          {
            id: 'seed_asset_alex_completed_001',
            jobId: 'seed_job_alex_completed',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/alex/completed/chapter_031_page_001.png',
            pageNumber: 1,
            originalFileName: 'chapter_031_page_001.png',
            mimeType: 'image/png',
            sizeBytes: 312456,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(3),
          },
          {
            id: 'seed_asset_alex_completed_002',
            jobId: 'seed_job_alex_completed',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/alex/completed/chapter_031_page_002.png',
            pageNumber: 2,
            originalFileName: 'chapter_031_page_002.png',
            mimeType: 'image/png',
            sizeBytes: 318902,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(3),
          },
          {
            id: 'seed_asset_alex_completed_003',
            jobId: 'seed_job_alex_completed',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/alex/completed/chapter_031_page_003.png',
            pageNumber: 3,
            originalFileName: 'chapter_031_page_003.png',
            mimeType: 'image/png',
            sizeBytes: 324118,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(3),
          },
          {
            id: 'seed_asset_alex_completed_004',
            jobId: 'seed_job_alex_completed',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/alex/completed/chapter_031_page_004.png',
            pageNumber: 4,
            originalFileName: 'chapter_031_page_004.png',
            mimeType: 'image/png',
            sizeBytes: 319884,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(3),
          },
          {
            id: 'seed_asset_alex_completed_manifest',
            jobId: 'seed_job_alex_completed',
            kind: 'result_manifest',
            bucketName: envServer.S3_RESULTS_BUCKET_NAME,
            objectKey: 'seed/alex/completed/result.json',
            originalFileName: 'result.json',
            mimeType: 'application/json',
            sizeBytes: 14562,
            metadata: { seedTag: DEMO_TAG, version: '2026-03-20.v1' },
            createdAt: hoursAgo(2.6),
          },
          {
            id: 'seed_asset_alex_processing_001',
            jobId: 'seed_job_alex_processing',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/alex/processing/chapter_032_page_001.png',
            pageNumber: 1,
            originalFileName: 'chapter_032_page_001.png',
            mimeType: 'image/png',
            sizeBytes: 298113,
            metadata: { seedTag: DEMO_TAG },
            createdAt: minutesAgo(35),
          },
          {
            id: 'seed_asset_alex_processing_002',
            jobId: 'seed_job_alex_processing',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/alex/processing/chapter_032_page_002.png',
            pageNumber: 2,
            originalFileName: 'chapter_032_page_002.png',
            mimeType: 'image/png',
            sizeBytes: 304220,
            metadata: { seedTag: DEMO_TAG },
            createdAt: minutesAgo(35),
          },
          {
            id: 'seed_asset_alex_processing_003',
            jobId: 'seed_job_alex_processing',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/alex/processing/chapter_032_page_003.png',
            pageNumber: 3,
            originalFileName: 'chapter_032_page_003.png',
            mimeType: 'image/png',
            sizeBytes: 301004,
            metadata: { seedTag: DEMO_TAG },
            createdAt: minutesAgo(35),
          },
          {
            id: 'seed_asset_mina_failed_001',
            jobId: 'seed_job_mina_failed',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/mina/failed/chapter_014_page_001.png',
            pageNumber: 1,
            originalFileName: 'chapter_014_page_001.png',
            mimeType: 'image/png',
            sizeBytes: 280410,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(1.4),
          },
          {
            id: 'seed_asset_mina_failed_002',
            jobId: 'seed_job_mina_failed',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/mina/failed/chapter_014_page_002.png',
            pageNumber: 2,
            originalFileName: 'chapter_014_page_002.png',
            mimeType: 'image/png',
            sizeBytes: 286444,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(1.4),
          },
          {
            id: 'seed_asset_mina_failed_003',
            jobId: 'seed_job_mina_failed',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/mina/failed/chapter_014_page_003.png',
            pageNumber: 3,
            originalFileName: 'chapter_014_page_003.png',
            mimeType: 'image/png',
            sizeBytes: 288120,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(1.4),
          },
          {
            id: 'seed_asset_mina_failed_004',
            jobId: 'seed_job_mina_failed',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/mina/failed/chapter_014_page_004.png',
            pageNumber: 4,
            originalFileName: 'chapter_014_page_004.png',
            mimeType: 'image/png',
            sizeBytes: 291337,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(1.4),
          },
          {
            id: 'seed_asset_mina_failed_005',
            jobId: 'seed_job_mina_failed',
            kind: 'page_upload',
            bucketName: envServer.S3_UPLOADS_BUCKET_NAME,
            objectKey: 'seed/mina/failed/chapter_014_page_005.png',
            pageNumber: 5,
            originalFileName: 'chapter_014_page_005.png',
            mimeType: 'image/png',
            sizeBytes: 294880,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(1.4),
          },
        ],
      });

      await tx.providerUsage.createMany({
        data: [
          {
            id: 'seed_usage_alex_completed_ocr',
            jobId: 'seed_job_alex_completed',
            provider: 'google_cloud_vision',
            stage: 'ocr',
            modelName: 'text-detection',
            pageCount: 4,
            requestCount: 4,
            latencyMs: 4200,
            costMicros: 9000n,
            success: true,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(2.8),
          },
          {
            id: 'seed_usage_alex_completed_translation',
            jobId: 'seed_job_alex_completed',
            provider: 'gemini',
            stage: 'translation',
            modelName: envServer.GEMINI_TRANSLATION_MODEL,
            pageCount: 4,
            requestCount: 1,
            inputTokens: 2300,
            outputTokens: 1600,
            latencyMs: 6100,
            costMicros: 28000n,
            success: true,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(2.7),
          },
          {
            id: 'seed_usage_alex_processing_ocr',
            jobId: 'seed_job_alex_processing',
            provider: 'google_cloud_vision',
            stage: 'ocr',
            modelName: 'text-detection',
            pageCount: 3,
            requestCount: 3,
            latencyMs: 3300,
            costMicros: 7000n,
            success: true,
            metadata: { seedTag: DEMO_TAG },
            createdAt: minutesAgo(26),
          },
          {
            id: 'seed_usage_mina_failed_ocr',
            jobId: 'seed_job_mina_failed',
            provider: 'google_cloud_vision',
            stage: 'ocr',
            modelName: 'text-detection',
            pageCount: 5,
            requestCount: 5,
            latencyMs: 5100,
            costMicros: 12000n,
            success: true,
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(1.25),
          },
          {
            id: 'seed_usage_mina_failed_translation',
            jobId: 'seed_job_mina_failed',
            provider: 'anthropic',
            stage: 'translation',
            modelName: envServer.ANTHROPIC_TRANSLATION_MODEL,
            pageCount: 5,
            requestCount: 1,
            inputTokens: 1800,
            outputTokens: 0,
            latencyMs: 60000,
            costMicros: 19000n,
            success: false,
            errorCode: 'provider_timeout',
            metadata: {
              seedTag: DEMO_TAG,
              providerMessage: 'Read timeout after 60000 ms',
            },
            createdAt: hoursAgo(1.15),
          },
        ],
      });

      await tx.tokenLedger.createMany({
        data: [
          {
            id: 'seed_ledger_alex_purchase',
            idempotencyKey: 'seed:alex:purchase',
            licenseId: alexLicense.id,
            orderId: 'seed_order_alex_pro_paid',
            type: 'purchase_credit',
            status: 'posted',
            deltaTokens: 2750,
            description: 'Seeded purchase credit for Alex demo account',
            metadata: { seedTag: DEMO_TAG, pack: 'pro' },
            createdAt: daysAgo(10),
          },
          {
            id: 'seed_ledger_alex_manual',
            idempotencyKey: 'seed:alex:manual-credit',
            licenseId: alexLicense.id,
            type: 'manual_credit',
            status: 'posted',
            deltaTokens: 120,
            description: 'Support goodwill credit for the Alex demo account',
            metadata: { seedTag: DEMO_TAG, grantedBy: support.id },
            createdAt: daysAgo(3),
          },
          {
            id: 'seed_ledger_alex_job_reserve_completed',
            idempotencyKey: 'seed:alex:job-reserve-completed',
            licenseId: alexLicense.id,
            jobId: 'seed_job_alex_completed',
            deviceId: alexActiveDevice.id,
            type: 'job_reserve',
            status: 'voided',
            deltaTokens: -20,
            description: 'Reserved tokens for completed demo job',
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(2.95),
          },
          {
            id: 'seed_ledger_alex_job_spend',
            idempotencyKey: 'seed:alex:job-spend-completed',
            licenseId: alexLicense.id,
            jobId: 'seed_job_alex_completed',
            deviceId: alexActiveDevice.id,
            type: 'job_spend',
            status: 'posted',
            deltaTokens: -20,
            description: 'Spent tokens for completed demo job',
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(2.6),
          },
          {
            id: 'seed_ledger_alex_job_reserve_processing',
            idempotencyKey: 'seed:alex:job-reserve-processing',
            licenseId: alexLicense.id,
            jobId: 'seed_job_alex_processing',
            deviceId: alexActiveDevice.id,
            type: 'job_reserve',
            status: 'pending',
            deltaTokens: -15,
            description: 'Reserved tokens for in-flight demo job',
            metadata: { seedTag: DEMO_TAG },
            createdAt: minutesAgo(30),
          },
          {
            id: 'seed_ledger_mina_purchase',
            idempotencyKey: 'seed:mina:purchase',
            licenseId: minaLicense.id,
            orderId: 'seed_order_mina_starter_paid',
            type: 'purchase_credit',
            status: 'posted',
            deltaTokens: 500,
            description: 'Seeded purchase credit for Mina demo account',
            metadata: { seedTag: DEMO_TAG, pack: 'starter' },
            createdAt: daysAgo(5),
          },
          {
            id: 'seed_ledger_mina_manual',
            idempotencyKey: 'seed:mina:manual-credit',
            licenseId: minaLicense.id,
            type: 'manual_credit',
            status: 'posted',
            deltaTokens: 50,
            description: 'Manual credit after failed provider run',
            metadata: { seedTag: DEMO_TAG, grantedBy: admin.id },
            createdAt: hoursAgo(1),
          },
          {
            id: 'seed_ledger_mina_job_reserve_failed',
            idempotencyKey: 'seed:mina:job-reserve-failed',
            licenseId: minaLicense.id,
            jobId: 'seed_job_mina_failed',
            deviceId: minaActiveDevice.id,
            type: 'job_reserve',
            status: 'voided',
            deltaTokens: -25,
            description: 'Reserved tokens for failed demo job',
            metadata: { seedTag: DEMO_TAG },
            createdAt: hoursAgo(1.35),
          },
          {
            id: 'seed_ledger_nora_purchase',
            idempotencyKey: 'seed:nora:purchase',
            licenseId: noraLicense.id,
            orderId: 'seed_order_nora_power_paid',
            type: 'purchase_credit',
            status: 'posted',
            deltaTokens: 8500,
            description: 'Seeded purchase credit for unredeemed demo license',
            metadata: { seedTag: DEMO_TAG, pack: 'power' },
            createdAt: hoursAgo(20),
          },
        ],
      });
    },
    { timeout: 60000 }
  );

  await Promise.all([
    db.contactMessage.upsert({
      where: {
        id: 'seed_contact_unread_checkout',
      },
      create: {
        id: 'seed_contact_unread_checkout',
        name: 'Lina Checkout',
        email: 'lina.checkout@demo.local',
        subject: 'Need help choosing the right token pack',
        message:
          'I read manga on two Android devices and want to understand whether the Pro pack is enough for OCR plus translation before I purchase.',
        status: 'unread',
        source: 'public_landing_form',
        ipAddress: '10.0.1.44',
        userAgent:
          'Mozilla/5.0 (Linux; Android 15; Pixel 8 Pro) AppleWebKit/537.36 Chrome/135.0 Mobile Safari/537.36',
        createdAt: minutesAgo(18),
      },
      update: {
        name: 'Lina Checkout',
        email: 'lina.checkout@demo.local',
        subject: 'Need help choosing the right token pack',
        message:
          'I read manga on two Android devices and want to understand whether the Pro pack is enough for OCR plus translation before I purchase.',
        status: 'unread',
        source: 'public_landing_form',
        ipAddress: '10.0.1.44',
        userAgent:
          'Mozilla/5.0 (Linux; Android 15; Pixel 8 Pro) AppleWebKit/537.36 Chrome/135.0 Mobile Safari/537.36',
        assignedToUserId: null,
        internalNotes: null,
        readAt: null,
        resolvedAt: null,
      },
    }),
    db.contactMessage.upsert({
      where: {
        id: 'seed_contact_in_progress_activation',
      },
      create: {
        id: 'seed_contact_in_progress_activation',
        name: 'Omar Activation',
        email: 'omar.activation@demo.local',
        subject: 'Redeem code works on old phone but not on new install',
        message:
          'I changed devices and now my redeem code says it is already used. I need help moving my activation to the new installation without losing tokens.',
        status: 'in_progress',
        source: 'public_landing_form',
        ipAddress: '10.0.1.45',
        userAgent:
          'Mozilla/5.0 (Linux; Android 15; Galaxy S23) AppleWebKit/537.36 Chrome/135.0 Mobile Safari/537.36',
        internalNotes:
          'Support is verifying whether the previous installation should be revoked before reissuing activation guidance.',
        assignedToUserId: support.id,
        readAt: minutesAgo(40),
        createdAt: minutesAgo(62),
      },
      update: {
        name: 'Omar Activation',
        email: 'omar.activation@demo.local',
        subject: 'Redeem code works on old phone but not on new install',
        message:
          'I changed devices and now my redeem code says it is already used. I need help moving my activation to the new installation without losing tokens.',
        status: 'in_progress',
        source: 'public_landing_form',
        ipAddress: '10.0.1.45',
        userAgent:
          'Mozilla/5.0 (Linux; Android 15; Galaxy S23) AppleWebKit/537.36 Chrome/135.0 Mobile Safari/537.36',
        internalNotes:
          'Support is verifying whether the previous installation should be revoked before reissuing activation guidance.',
        assignedToUserId: support.id,
        readAt: minutesAgo(40),
        resolvedAt: null,
      },
    }),
    db.contactMessage.upsert({
      where: {
        id: 'seed_contact_resolved_invoice',
      },
      create: {
        id: 'seed_contact_resolved_invoice',
        name: 'Maya Billing',
        email: 'maya.billing@demo.local',
        subject: 'Need invoice details for my Lemon Squeezy receipt',
        message:
          'Can you confirm the billing information used for my purchase and tell me which token pack was attached to the receipt?',
        status: 'resolved',
        source: 'public_landing_form',
        ipAddress: '10.0.1.46',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
        internalNotes:
          'Invoice details confirmed and the customer was pointed to the matching Lemon Squeezy order record.',
        assignedToUserId: admin.id,
        readAt: hoursAgo(6),
        resolvedAt: hoursAgo(5.5),
        createdAt: hoursAgo(7),
      },
      update: {
        name: 'Maya Billing',
        email: 'maya.billing@demo.local',
        subject: 'Need invoice details for my Lemon Squeezy receipt',
        message:
          'Can you confirm the billing information used for my purchase and tell me which token pack was attached to the receipt?',
        status: 'resolved',
        source: 'public_landing_form',
        ipAddress: '10.0.1.46',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
        internalNotes:
          'Invoice details confirmed and the customer was pointed to the matching Lemon Squeezy order record.',
        assignedToUserId: admin.id,
        readAt: hoursAgo(6),
        resolvedAt: hoursAgo(5.5),
      },
    }),
  ]);

  console.log('✅ Backoffice demo data seeded');
  console.log(
    `👉 Support lookup examples: ${emphasis(DEMO_USERS.alex)}, ${emphasis(DEMO_REDEEM_CODES.alexCurrent)}, ${emphasis(DEMO_INSTALLATIONS.alexActive)}`
  );
  console.log(
    `👉 More demo queries: ${emphasis(DEMO_USERS.mina)}, ${emphasis(DEMO_LICENSE_KEYS.nora)}, ${emphasis('ls_order_demo_alex_pro_001')}`
  );
  console.log(
    `👉 Contact inbox examples: ${emphasis('lina.checkout@demo.local')}, ${emphasis('omar.activation@demo.local')}, ${emphasis('maya.billing@demo.local')}`
  );
}
