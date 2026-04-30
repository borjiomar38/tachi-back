const publicSiteName = 'TachiyomiAT';
const publicBaseUrlFallback = 'https://tachi-back.vercel.app';
const socialImagePath = '/og/tachiyomiat-social-preview.jpg';

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
    ],
    links: [
      {
        rel: 'canonical',
        href: url,
      },
    ],
  };
};
