import { createFileRoute } from '@tanstack/react-router';

import { publicSeoKeywords } from '@/features/blog/seo';
import {
  buildPublicAbsoluteUrl,
  buildPublicFaqStructuredData,
  buildPublicPageHead,
} from '@/features/public/head';
import {
  PageTranslateManhwaAi,
  translateManhwaAiFaqs,
} from '@/features/public/page-translate-manhwa-ai';

const translateManhwaAiStructuredData = () => {
  const path = '/translate-manhwa-ai';
  const url = buildPublicAbsoluteUrl(path);

  return [
    ...buildPublicFaqStructuredData(path, translateManhwaAiFaqs),
    {
      '@type': 'HowTo',
      '@id': `${url}#how-to`,
      name: 'How to translate manhwa on Android with Nayovi',
      description:
        'Install Nayovi, open a manhwa chapter, choose a language, and read the translated text directly on the page.',
      step: [
        {
          '@type': 'HowToStep',
          position: 1,
          name: 'Download Nayovi',
          text: 'Install the official Nayovi APK on your Android phone.',
          url: buildPublicAbsoluteUrl('/download'),
        },
        {
          '@type': 'HowToStep',
          position: 2,
          name: 'Open a chapter',
          text: 'Choose a manhwa, manga, or manhua chapter in the app.',
        },
        {
          '@type': 'HowToStep',
          position: 3,
          name: 'Choose your language',
          text: 'Let Nayovi translate the detected text and continue reading on the page.',
        },
      ],
    },
  ];
};

export const Route = createFileRoute('/translate-manhwa-ai')({
  component: RouteComponent,
  head: () =>
    buildPublicPageHead(
      'AI Manhwa Translator for Android',
      'Translate manhwa, manga, and manhua directly on the page with Nayovi for Android. Try about two chapters free, with no card required.',
      '/translate-manhwa-ai',
      {
        imageAlt:
          'Nayovi Android app showing Korean manhwa before translation and English after translation.',
        imageHeight: 1565,
        imagePath: '/marketing/nayovi-manhwa-translation-phone.webp',
        imageType: 'image/webp',
        imageWidth: 682,
        keywords: [
          ...publicSeoKeywords,
          'AI manhwa translator',
          'translate manhwa AI',
          'Korean manhwa translator',
          'Android manhwa translator',
          'manga AI translator app',
          'manhua AI translator',
          'TachiyomiAT translator',
          'Mihon translator',
        ],
        structuredDataGraph: translateManhwaAiStructuredData(),
        titleSuffix: 'Nayovi',
        type: 'manhwa',
      }
    ),
});

function RouteComponent() {
  return <PageTranslateManhwaAi />;
}
