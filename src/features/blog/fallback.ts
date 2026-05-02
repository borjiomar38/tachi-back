import { BlogArticleDetail, BlogArticleSummary } from '@/features/blog/schema';
import { buildBlogSeoKeywords } from '@/features/blog/seo';

export const fallbackBlogArticle: BlogArticleDetail = {
  body: {
    disclaimer:
      'TachiyomiAT does not host manga, manhwa, or manhua chapters. Use the app only with content you own, content in the public domain, or content you have permission to process, and respect official releases and rights holders.',
    downloadCallout: {
      body: 'Install the Android APK from the official TachiyomiAT download page, activate hosted mode with your redeem code, and keep the same dark reader-focused workflow across manga, manhwa, and manhua translation tasks.',
      buttonLabel: 'Download TachiyomiAT',
      title: 'Download TachiyomiAT for Android',
    },
    faqs: [
      {
        answer:
          'No. TachiyomiAT is focused on the app, hosted OCR, translation workflow, activation, and support. It does not publish or distribute manga, manhwa, or manhua chapters.',
        question: 'Does TachiyomiAT host manhwa chapters?',
      },
      {
        answer:
          'The workflow is useful when a page needs text detection, cleaner translation, and a consistent reading flow. It is especially practical for dialogue-heavy vertical chapters and busy action scenes.',
        question: 'Why use a translation workflow for manhwa?',
      },
      {
        answer:
          'Use the official download page or APK CTA in each article. The link points to the TachiyomiAT backend so readers get the current Android build instead of a random mirror.',
        question: 'Where is the TachiyomiAT download link?',
      },
    ],
    introduction:
      'Readers searching for manhwa, manhua, manga translation, manhwa translate ia, or a Tachiyomi-style Android workflow usually want the same thing: a clean way to keep reading without fighting messy text, confusing setup, or scattered download links. TachiyomiAT keeps that flow focused on the app, hosted OCR, AI-assisted translation, redeem-code activation, and a consistent Android APK download path.',
    readingProfile: {
      bestFor:
        'Android readers who already have legal access to chapters and want a simpler hosted translation workflow.',
      pacing:
        'Best for fast vertical chapters, recurring terminology, and scenes where OCR needs to separate dialogue from effects.',
      tone: 'Dark, cinematic, reader-first, and practical rather than promotional or noisy.',
    },
    sections: [
      {
        body: 'Manhwa and manhua pages often mix tall-panel composition, sound effects, narration boxes, and short dialogue bursts. A good translation workflow has to preserve that rhythm. TachiyomiAT is designed around opening the app, activating hosted mode once, and sending page text through the backend when a chapter needs help.',
        heading: 'Why manhwa translation needs a stable workflow',
        takeaways: [
          'Vertical chapters benefit from clean OCR ordering.',
          'Short dialogue should stay compact enough for reading flow.',
          'Recurring names and techniques need consistent wording.',
        ],
      },
      {
        body: 'Every blog article uses the same download CTA so visitors do not have to hunt for the APK. The main path is the official TachiyomiAT download page, with the direct APK endpoint behind the button. That keeps the site consistent for search visitors and safer than sending readers to third-party mirrors.',
        heading: 'Keep the TachiyomiAT download link consistent',
        takeaways: [
          'Use the official site download page.',
          'Avoid random mirrors or reposted APKs.',
          'Pair download guidance with setup and activation context.',
        ],
      },
      {
        body: 'The strongest traffic pages should be useful before they are promotional. Articles can explain a manhwa reading problem, describe how OCR and translation affect the reading experience, then point to TachiyomiAT as the app workflow. That is better for readers and safer for long-term SEO.',
        heading: 'Write useful articles before chasing traffic',
        takeaways: [
          'Answer a real reader search intent.',
          'Avoid links to unauthorized chapter sources.',
          'Make the app CTA visible but not disruptive.',
        ],
      },
    ],
  },
  excerpt:
    'A practical guide to TachiyomiAT for readers searching for manhwa, manhua, manga translation, and a consistent Android APK download path.',
  heroImageUrl: null,
  imageAlt:
    'Dark cinematic manhwa-style TachiyomiAT reader scene with an Android translation workflow.',
  imagePrompt:
    'Original dark cinematic manhwa-style illustration of an Android reader interface glowing in a midnight studio, dramatic violet rim light, floating OCR panels, no copyrighted characters, no logos, no readable text, inspired by a premium login page mood.',
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
    'tachiyomi download',
    'tachiyomiat',
    'manhwa translation',
    'manhua reader',
    'manga OCR',
    'android APK',
  ]),
  manhwaTitle: 'TachiyomiAT',
  manhwaType: 'manhwa',
  metaDescription:
    'Download TachiyomiAT for Android and learn how the app supports manga, manhwa, and manhua translation with hosted OCR and redeem-code activation.',
  publishedAt: '2026-05-01T00:00:00.000Z',
  searchIntent: 'tachiyomi download manhwa translation app',
  slug: 'download-tachiyomiat-for-manhwa-translation',
  title: 'Download TachiyomiAT for Manhwa and Manga Translation',
  updatedAt: '2026-05-01T00:00:00.000Z',
  uxReview: {
    notes: [
      'Article uses the fixed introduction, section, reading profile, CTA, FAQ, and disclaimer structure.',
      'Download CTA is consistent across generated articles.',
      'Legal disclaimer protects the site from appearing to host chapters.',
    ],
    passed: true,
    score: 100,
  },
};

export const fallbackBlogArticleSummary: BlogArticleSummary = {
  excerpt: fallbackBlogArticle.excerpt,
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
