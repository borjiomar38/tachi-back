import { BlogArticleDetail, BlogArticleSummary } from '@/features/blog/schema';
import { buildBlogSeoKeywords } from '@/features/blog/seo';

export const fallbackBlogArticle: BlogArticleDetail = {
  body: {
    disclaimer:
      'Nayovi does not host manga, manhwa, or manhua chapters. Use the app only with content you own, content in the public domain, or content you have permission to process, and respect official releases and rights holders.',
    downloadCallout: {
      body: 'Install the Android APK from the official Nayovi page, choose your reading language, and translate manhwa, manga, or manhua without a complicated setup.',
      buttonLabel: 'Download Nayovi',
      title: 'Download Nayovi for Android',
    },
    faqs: [
      {
        answer:
          'No. Nayovi helps you translate chapters that you can legally access. It does not publish or distribute manga, manhwa, or manhua chapters.',
        question: 'Does Nayovi host manhwa chapters?',
      },
      {
        answer:
          'The workflow is useful when a page needs text detection, cleaner translation, and a consistent reading flow. It is especially practical for dialogue-heavy vertical chapters and busy action scenes.',
        question: 'Why use a translation workflow for manhwa?',
      },
      {
        answer:
          'Use the official download button in this guide or visit the Nayovi download page. Both lead to the current Android build instead of an unknown mirror.',
        question: 'Where is the Nayovi download link?',
      },
    ],
    introduction:
      'When a manhwa, manga, or manhua chapter is not available in your language, Nayovi gives you a simple way to keep reading on Android. Open a chapter you can legally access, choose your language, and read the translated text in a familiar reader without juggling several tools.',
    readingProfile: {
      bestFor:
        'Android readers who already have legal access to chapters and want a simpler hosted translation workflow.',
      pacing:
        'Best for fast vertical chapters, recurring terminology, and scenes where OCR needs to separate dialogue from effects.',
      tone: 'A focused reading experience that keeps the chapter, dialogue, and translation easy to follow.',
    },
    sections: [
      {
        body: 'Manhwa and manhua often combine tall panels, sound effects, narration boxes, and short lines of dialogue. Nayovi keeps the pages in reading order so the translated chapter remains comfortable to follow from one panel to the next.',
        heading: 'Keep vertical chapters easy to follow',
        takeaways: [
          'Read tall chapters in their natural order.',
          'Keep short dialogue clear and easy to scan.',
          'Follow recurring names and terms consistently.',
        ],
      },
      {
        body: 'Download Nayovi from the official page so you receive the current Android build and clear installation instructions. This is safer and easier than searching through unrelated APK mirrors or old reposted versions.',
        heading: 'Install Nayovi from the official page',
        takeaways: [
          'Use the official Nayovi download page.',
          'Avoid unknown mirrors and outdated builds.',
          'Follow the Android installation steps on the site.',
        ],
      },
      {
        body: 'Start with the free chapters to see how translation feels with the series you read. If you want to continue, compare the monthly plans and choose the amount of reading that suits you instead of paying for more than you need.',
        heading: 'Choose a plan that fits your reading',
        takeaways: [
          'Try two chapters before choosing a plan.',
          'Compare monthly options in one place.',
          'Use only chapters you can legally access.',
        ],
      },
    ],
  },
  excerpt:
    'Learn how to install Nayovi on Android, translate manhwa, manga, and manhua, and choose a reading plan after trying two chapters free.',
  heroImageUrl: null,
  imageAlt:
    'Dark cinematic manhwa-style Nayovi reader scene with an Android translation workflow.',
  imagePrompt:
    'Original fun and exciting dark cinematic manhwa-style hero illustration of an Android reader interface glowing in a midnight studio, dramatic motion, violet rim light, floating OCR panels, AI translation workflow, energetic app-download mood, no copyrighted characters, no logos, no readable text, inspired by a premium login page mood.',
  imageReview: {
    notes: [
      'Prompt requests an original composition instead of copying known characters.',
      'Prompt keeps the dark cinematic manhwa mood used across the login and public pages.',
      'Prompt avoids readable text so generated art does not create broken typography.',
    ],
    passed: true,
    score: 100,
  },
  keywords: buildBlogSeoKeywords([
    'manga translate ai',
    'manhwa translate ai',
    'manhua translate ai',
    'TachiyomiAT',
    'TachiyomiAT download',
    'Mihon',
    'tachiyomi download',
    'nayovi',
    'manhwa translation',
    'manhua reader',
    'manga OCR',
    'android APK',
  ]),
  manhwaTitle: 'Nayovi',
  manhwaType: 'manhwa',
  metaDescription:
    'Install Nayovi on Android and learn how to translate manhwa, manga, and manhua chapters in your language with a simple reader-first workflow.',
  publishedAt: '2026-05-01T00:00:00.000Z',
  searchIntent: 'download an Android app to translate manhwa and manga',
  slug: 'download-nayovi-for-manhwa-translation',
  title: 'Download Nayovi for Manhwa and Manga Translation',
  updatedAt: '2026-05-31T00:00:00.000Z',
  uxReview: {
    notes: [
      'Article uses a clear introduction, reading profile, guide, FAQ, and disclaimer structure.',
      'The official download path is clear and easy for readers to find.',
      'Legal disclaimer protects the site from appearing to host chapters.',
    ],
    passed: true,
    score: 100,
  },
};

export const fallbackBlogArticleSummary: BlogArticleSummary = {
  excerpt: fallbackBlogArticle.excerpt,
  heroImageUrl: fallbackBlogArticle.heroImageUrl,
  imageAlt: fallbackBlogArticle.imageAlt,
  imagePrompt: fallbackBlogArticle.imagePrompt,
  keywords: fallbackBlogArticle.keywords,
  manhwaTitle: fallbackBlogArticle.manhwaTitle,
  manhwaType: fallbackBlogArticle.manhwaType,
  publishedAt: fallbackBlogArticle.publishedAt,
  slug: fallbackBlogArticle.slug,
  title: fallbackBlogArticle.title,
  updatedAt: fallbackBlogArticle.updatedAt,
};
