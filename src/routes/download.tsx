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
  const directoryQualityItems = [
    {
      name: 'Preserve official source links',
      description:
        'Accept only listings that keep the official download, pricing, support, privacy, terms, and responsible-use links visible.',
    },
    {
      name: 'Reject paid or reciprocal link gates',
      description:
        'Do not use directories that require dofollow backlinks, paid placement, review swaps, or badges as a condition for listing.',
    },
    {
      name: 'Represent access and pricing accurately',
      description:
        'Describe Nayovi as free trial plus redeem-code access and paid hosted OCR/AI translation token plans.',
    },
  ] as const;
  const apkSourceSetupItems = [
    {
      name: 'Keep the download page as the source of truth',
      description:
        'Store the official Nayovi download page with the APK endpoint so support, pricing, privacy, terms, and responsible-use context stay attached to the file.',
    },
    {
      name: 'Verify each update before citing it',
      description:
        'Compare the published build label, file name, size, and SHA-256 hash before accepting an update from an APK tracker, directory, or review packet.',
    },
    {
      name: 'Avoid mirror-first references',
      description:
        'Treat third-party APK pages as discovery surfaces only unless they preserve the official source links, metadata, support route, and no-chapter-hosting boundary.',
    },
  ] as const;
  const ownerConfirmationItems = [
    {
      name: 'Use confirmed fields now',
      description:
        'Cite official domains, the current download URL, APK file metadata, pricing, support, privacy, terms, and responsible-use links.',
    },
    {
      name: 'Wait for owner-confirmed release identity',
      description:
        'Do not publish package name, signing-certificate fingerprint, Android developer verification status, screenshots, or public tester report claims until the owner confirms them.',
    },
    {
      name: 'Keep pending fields explicit',
      description:
        'Mark missing package, signing, and verification details as owner-confirmation required instead of copying claims from mirrors or third-party pages.',
    },
    {
      name: 'Prepare Android 2026 verification language',
      description:
        'For Android developer verification coverage, cite package, signing, registration, and verification status as pending owner confirmation until the official owner supplies exact public facts.',
    },
  ] as const;
  const androidVerificationItems = [
    {
      name: 'Use pending-language readiness',
      description:
        'Nayovi can cite official APK source links and current file metadata now, while package name, signing fingerprint, developer verification status, and package registration state remain owner-confirmation required.',
    },
    {
      name: 'Avoid unsupported verification claims',
      description:
        'Do not imply Google Play approval, Android developer verification, store availability, or third-party endorsement before the owner confirms those public facts.',
    },
    {
      name: 'Preserve source-of-truth context',
      description:
        'Reviewer and directory citations should keep download, pricing, support, privacy, terms, responsible-use, and screenshot-policy context attached to the APK metadata.',
    },
  ] as const;
  const citationReadinessItems = [
    {
      name: 'Media or podcast citation',
      description:
        'Lead with the OCR QA checklist, approved-sample boundary, and human-review notes before mentioning install links or review codes.',
    },
    {
      name: 'Directory citation',
      description:
        'Confirm the listing can show trial plus paid-token pricing, source-of-truth links, support, privacy, terms, and no-chapter-hosting language.',
    },
    {
      name: 'Localization partner citation',
      description:
        'Use a no-link resource note first and ask whether approved-sample OCR observations are useful without implying catalog access or replacement of professional localization.',
    },
    {
      name: 'Android policy citation',
      description:
        'Keep package name, signing fingerprint, and developer verification status marked owner-confirmation required until the exact public facts are confirmed.',
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
    {
      '@type': 'ItemList',
      '@id': `${url}#directory-quality-filter`,
      name: 'Nayovi directory listing quality filter',
      itemListElement: directoryQualityItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#apk-source-setup-note`,
      name: 'Nayovi APK source setup note',
      itemListElement: apkSourceSetupItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#owner-confirmed-apk-fields`,
      name: 'Nayovi owner-confirmed APK trust fields',
      itemListElement: ownerConfirmationItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#android-developer-verification-readiness`,
      name: 'Nayovi Android developer verification readiness',
      itemListElement: androidVerificationItems.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        description: item.description,
      })),
    },
    {
      '@type': 'ItemList',
      '@id': `${url}#third-party-citation-readiness`,
      name: 'Nayovi third-party citation readiness packet',
      itemListElement: citationReadinessItems.map((item, index) => ({
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
