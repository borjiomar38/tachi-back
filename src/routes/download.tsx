import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import { androidApkDownload } from '@/features/public/download-assets';
import {
  buildPublicAbsoluteUrl,
  buildPublicPageHead,
} from '@/features/public/head';
import { PageDownload } from '@/features/public/page-download';

const downloadStructuredData = () => {
  const url = buildPublicAbsoluteUrl('/download');
  const steps = [
    {
      name: 'Download the official Nayovi APK',
      description:
        'Use the official tachiyomiat.com download endpoint for the current Nayovi Android APK.',
    },
    {
      name: 'Verify the APK metadata',
      description: `Compare the APK filename, build label, size, and SHA-256 hash before reviewing or listing the app. Current SHA-256: ${androidApkDownload.sha256}.`,
    },
    {
      name: 'Activate hosted translation',
      description:
        'Open the Android app, enter a redeem code, and use hosted OCR and AI translation for approved manga, manhwa, or manhua content.',
    },
  ] as const;
  const reviewerPacketItems = [
    {
      name: 'Confirm the official APK source',
      description:
        'Start from tachiyomiat.com or nayovi.com, then keep the official download, pricing, support, privacy, terms, and responsible-use links attached to the listing.',
    },
    {
      name: 'Record release proof',
      description:
        'Attach the APK filename, build label, size, SHA-256 hash, package ownership notes, signing evidence, and Android developer verification status when those details are available.',
    },
    {
      name: 'Test only approved samples',
      description:
        'Use public-domain, official-sample, owned, or permission-approved pages when checking OCR coverage, reading order, translation latency, and review screenshots.',
    },
    {
      name: 'Route serious testers through support',
      description:
        'Ask support for a redeem code, screenshot context, narrated demo, and sample-safe review scope before publishing a hands-on article, directory listing, or partner note.',
    },
  ] as const;
  const thirdPartyCitationItems = [
    {
      name: 'Directory listing citation',
      description:
        'Point installation traffic to the official Nayovi download page, keep the APK hash and support links visible, and avoid mirror-first APK redistribution.',
    },
    {
      name: 'Editorial review citation',
      description:
        'Request redeem-code access, approved-sample scope, device notes, and release metadata before publishing a hands-on Android OCR translation review.',
    },
    {
      name: 'Partner pilot citation',
      description:
        'Limit partner pilots to creator-approved, official-sample, public-domain, or owner-provided pages, then confirm which results can be cited publicly.',
    },
  ] as const;

  return [
    {
      '@type': 'SoftwareApplication',
      '@id': `${url}#apk`,
      name: 'Nayovi Android APK',
      alternateName: ['TachiyomiAT APK', 'Tachiyomi AT APK'],
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Android',
      downloadUrl: buildPublicAbsoluteUrl(androidApkDownload.href),
      fileSize: androidApkDownload.sizeLabel,
      softwareVersion: androidApkDownload.buildLabel,
      url,
      offers: [
        {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description:
            'Free trial access before monthly hosted OCR and AI translation token plans.',
          url: buildPublicAbsoluteUrl('/pricing'),
        },
      ],
    },
    {
      '@type': 'HowTo',
      '@id': `${url}#install-howto`,
      name: 'How to install and activate the Nayovi Android APK',
      description:
        'Download the official Nayovi APK, verify source-of-truth metadata, then activate hosted OCR and AI translation with a redeem code.',
      step: steps.map((step) => ({
        '@type': 'HowToStep',
        name: step.name,
        text: step.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#reviewer-verification-packet`,
      name: 'Nayovi APK reviewer verification packet',
      itemListElement: reviewerPacketItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#third-party-citation-handoff`,
      name: 'How third parties should cite Nayovi',
      itemListElement: thirdPartyCitationItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
  ];
};

export const Route = createFileRoute('/download')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'TachiyomiAT APK Download for Android',
      'Download the TachiyomiAT-style Nayovi APK for Android, then activate hosted OCR and free manga, manhwa, or manhua AI translation with a redeem code.',
      '/download',
      {
        keywords: [
          ...publicSeoKeywords,
          'TachiyomiAT APK',
          'Tachiyomi AT APK',
          'TachiyomiAT download',
          'Tachiyomi AT download',
          'Tachiyomi download',
          'Mihon Android reader',
          'download free manga ai translator',
          'download free manhwa ai translator',
          'Nayovi APK download',
          'Android manga translator APK',
        ],
        structuredDataGraph: downloadStructuredData(),
      }
    ),
});

function RouteComponent() {
  return <PageDownload />;
}
