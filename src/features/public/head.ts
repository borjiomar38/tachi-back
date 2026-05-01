import { BlogArticleDetail } from '@/features/blog/schema';

const publicSiteName = 'TachiyomiAT';
const publicBaseUrlFallback = 'https://tachiyomiat.com';
const socialImagePath = '/og/tachiyomiat-social-preview.jpg';
const publicSiteDescription =
  'TachiyomiAT helps Android readers translate manga and manhwa with hosted OCR, translation, source discovery, monthly token plans, and redeem-code activation.';

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

const buildStructuredData = (
  title: string,
  description: string,
  url: string,
  imageUrl: string
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
      },
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
    robots?: string;
  }
) => {
  const title = buildPublicTitle(pageTitle);
  const url = buildAbsoluteUrl(path);
  const imageUrl = buildAbsoluteUrl(socialImagePath);
  const structuredData = buildStructuredData(title, description, url, imageUrl);

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
        content: 'image/jpeg',
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
        content:
          'TachiyomiAT manga and manhwa translation preview with hosted OCR and app activation.',
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
        content:
          'TachiyomiAT manga and manhwa translation preview with hosted OCR and app activation.',
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
    'Read TachiyomiAT guides for manhwa, manhua, manga translation, hosted OCR, Android APK download, and reader-friendly setup workflows.';

  return buildPublicPageHead('Manhwa Blog', description, '/blog');
};

export const buildPublicBlogArticleHead = (
  article: BlogArticleDetail
): ReturnType<typeof buildPublicPageHead> => {
  const baseHead = buildPublicPageHead(
    article.title,
    article.metaDescription,
    `/blog/${article.slug}`
  );

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
      ...article.keywords.slice(0, 8).map((keyword) => ({
        property: 'article:tag',
        content: keyword,
      })),
    ],
  };
};
