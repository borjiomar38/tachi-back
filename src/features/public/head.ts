import { BlogArticleDetail } from '@/features/blog/schema';
import {
  buildBlogSeoKeywords,
  buildPublicSeoKeywords,
  highIntentBlogSeoKeywords,
} from '@/features/blog/seo';

const publicSiteName = 'TachiyomiAT';
const publicBaseUrlFallback = 'https://tachiyomiat.com';
const socialImagePath = '/og/tachiyomiat-social-preview.jpg';
const publicSiteDescription =
  'TachiyomiAT is a free manga IA translator, free manhwa IA translator, and free manhua IA translator for Android readers who want hosted OCR, clean AI translation, APK download, and redeem-code activation.';

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, '');

const buildAbsoluteUrl = (path: string) => {
  const env = import.meta.env;
  const previewUrl =
    env.VITE_VERCEL_ENV === 'preview' ? env.VITE_VERCEL_BRANCH_URL : undefined;
  const baseUrl = previewUrl ? `https://${previewUrl}` : env.VITE_BASE_URL;
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl || publicBaseUrlFallback);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBaseUrl}${normalizedPath}`;
};

export const buildPublicAbsoluteUrl = buildAbsoluteUrl;

export const buildPublicFaqStructuredData = (
  path: string,
  faqs: readonly { description: string; title: string }[]
) => {
  if (faqs.length === 0) {
    return [];
  }

  return [
    {
      '@type': 'FAQPage',
      '@id': `${buildAbsoluteUrl(path)}#faq`,
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.title,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.description,
        },
      })),
    },
  ];
};

const toAbsoluteAssetUrl = (value: string) => {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return buildAbsoluteUrl(value);
};

const buildStructuredData = (
  title: string,
  description: string,
  url: string,
  imageUrl: string,
  extraGraph: readonly Record<string, unknown>[] = []
) => {
  const baseUrl = buildAbsoluteUrl('/');
  const organizationId = `${baseUrl}#organization`;
  const websiteId = `${baseUrl}#website`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: publicSiteName,
        url: baseUrl,
        logo: buildAbsoluteUrl('/tachiyomiat-mark-light.png'),
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: 'TachiyomiAT Manga Translator',
        url: baseUrl,
        description: publicSiteDescription,
        inLanguage: 'en',
        publisher: {
          '@id': organizationId,
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        name: title,
        url,
        description,
        image: imageUrl,
        isPartOf: {
          '@id': websiteId,
        },
        inLanguage: 'en',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${baseUrl}#android-app`,
        name: publicSiteName,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Android',
        url: buildAbsoluteUrl('/download'),
        description: publicSiteDescription,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description:
            'Free TachiyomiAT trial access for manga, manhwa, and manhua IA translation.',
        },
      },
      ...extraGraph,
    ],
  };
};

const buildPublicTitle = (pageTitle: string) =>
  `${pageTitle} | TachiyomiAT Manga Translator`;

export const buildPublicPageHead = (
  pageTitle: string,
  description: string,
  path: string,
  options?: {
    keywords?: readonly string[];
    imageAlt?: string;
    imagePath?: string;
    imageType?: string;
    structuredDataGraph?: readonly Record<string, unknown>[];
    robots?: string;
    type?: string | null;
  }
) => {
  const title = buildPublicTitle(pageTitle);
  const url = buildAbsoluteUrl(path);
  const imageUrl = toAbsoluteAssetUrl(options?.imagePath ?? socialImagePath);
  const imageAlt =
    options?.imageAlt ??
    'TachiyomiAT free manga, manhwa, and manhua IA translator preview.';
  const keywords = options?.keywords
    ? buildPublicSeoKeywords(options.keywords, {
        type: options.type,
      })
    : [];
  const structuredData = buildStructuredData(
    title,
    description,
    url,
    imageUrl,
    options?.structuredDataGraph
  );

  return {
    meta: [
      {
        title,
      },
      {
        name: 'description',
        content: description,
      },
      {
        name: 'robots',
        content: options?.robots ?? 'index, follow, max-image-preview:large',
      },
      ...(keywords.length > 0
        ? [
            {
              name: 'keywords',
              content: keywords.join(', '),
            },
          ]
        : []),
      {
        name: 'application-name',
        content: publicSiteName,
      },
      {
        property: 'og:site_name',
        content: publicSiteName,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:locale',
        content: 'en_US',
      },
      {
        property: 'og:title',
        content: title,
      },
      {
        property: 'og:description',
        content: description,
      },
      {
        property: 'og:url',
        content: url,
      },
      {
        property: 'og:image',
        content: imageUrl,
      },
      {
        property: 'og:image:secure_url',
        content: imageUrl,
      },
      {
        property: 'og:image:type',
        content: options?.imageType ?? 'image/jpeg',
      },
      {
        property: 'og:image:width',
        content: '1200',
      },
      {
        property: 'og:image:height',
        content: '630',
      },
      {
        property: 'og:image:alt',
        content: imageAlt,
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: title,
      },
      {
        name: 'twitter:description',
        content: description,
      },
      {
        name: 'twitter:image',
        content: imageUrl,
      },
      {
        name: 'twitter:image:alt',
        content: imageAlt,
      },
      {
        'script:ld+json': structuredData,
      },
    ],
    links: [
      {
        rel: 'canonical',
        href: url,
      },
    ],
  };
};

export const buildPublicBlogIndexHead = (): ReturnType<
  typeof buildPublicPageHead
> => {
  const description =
    'Read TachiyomiAT guides for manga translate ia, manhwa translate ia, manhua translate ia, free manga IA translator setup, hosted OCR, Android APK download, and reader-friendly workflows.';

  return buildPublicPageHead('Manga, Manhwa and Manhua IA Translator Blog', description, '/blog', {
    keywords: highIntentBlogSeoKeywords,
  });
};

export const buildPublicBlogArticleHead = (
  article: BlogArticleDetail
): ReturnType<typeof buildPublicPageHead> => {
  const baseHead = buildPublicPageHead(
    article.title,
    article.metaDescription,
    `/blog/${article.slug}`,
    {
      imageAlt: `${article.title} hero image for TachiyomiAT ${article.manhwaType} IA translation.`,
      imagePath: article.heroImageUrl ?? undefined,
      imageType: article.heroImageUrl ? 'image/png' : undefined,
      keywords: article.keywords,
      structuredDataGraph: buildArticleStructuredData(article),
      type: article.manhwaType,
    }
  );
  const keywords = buildBlogSeoKeywords(article.keywords, {
    type: article.manhwaType,
  });

  return {
    ...baseHead,
    meta: [
      ...baseHead.meta.filter(
        (entry) => !('property' in entry) || entry.property !== 'og:type'
      ),
      {
        property: 'og:type',
        content: 'article',
      },
      {
        property: 'article:published_time',
        content: article.publishedAt,
      },
      {
        property: 'article:modified_time',
        content: article.updatedAt,
      },
      {
        property: 'article:section',
        content: article.manhwaType,
      },
      ...keywords.slice(0, 8).map((keyword) => ({
        property: 'article:tag',
        content: keyword,
      })),
    ],
  };
};

const buildArticleStructuredData = (article: BlogArticleDetail) => {
  const articleUrl = buildAbsoluteUrl(`/blog/${article.slug}`);
  const imageUrl = article.heroImageUrl
    ? toAbsoluteAssetUrl(article.heroImageUrl)
    : buildAbsoluteUrl(socialImagePath);
  const baseUrl = buildAbsoluteUrl('/');
  const graph: Record<string, unknown>[] = [
    {
      '@type': 'BlogPosting',
      '@id': `${articleUrl}#article`,
      headline: article.title,
      description: article.metaDescription,
      image: imageUrl,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      articleSection: article.manhwaType,
      keywords: buildBlogSeoKeywords(article.keywords, {
        limit: 12,
        type: article.manhwaType,
      }).join(', '),
      mainEntityOfPage: {
        '@id': `${articleUrl}#webpage`,
      },
      publisher: {
        '@id': `${baseUrl}#organization`,
      },
    },
  ];

  if (article.body.faqs.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${articleUrl}#faq`,
      mainEntity: article.body.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });
  }

  return graph;
};
