import { BlogArticleDetail } from "@/features/blog/schema";
import {
  buildBlogSeoKeywords,
  buildPublicSeoKeywords,
  highIntentBlogSeoKeywords,
} from "@/features/blog/seo";
import {
  fallbackPublicTokenPacks,
  formatCurrency,
} from "@/features/public/data";

const publicSiteName = "Nayovi";
const publicBaseUrlFallback = "https://tachiyomiat.com";
const publicBrandUrl = "https://nayovi.com";
const publicSeoUrl = "https://translate-manhwa-ai.com";
const socialImagePath = "/og/nayovi-social-preview.jpg";
const publicBrandAliases = [
  "TachiyomiAT",
  "Tachiyomi AT",
  "tachiyomiat.com",
  "nayovi.com",
  "translate-manhwa-ai.com",
];
const publicSiteDescription =
  "Nayovi is a manhwa and manga translator for Android that lets readers translate manhwa, manga, and manhua chapters inside a familiar reading app.";

const normalizeBaseUrl = (url: string) => url.replace(/\/+$/, "");
const normalizePath = (path: string) =>
  path.startsWith("/") ? path : `/${path}`;

const isLocalBaseUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname;

    return ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "::1"].includes(
      hostname,
    );
  } catch {
    return false;
  }
};

const resolveConfiguredBaseUrl = () => {
  const env = import.meta.env;
  const previewUrl =
    env.VITE_VERCEL_ENV === "preview" ? env.VITE_VERCEL_BRANCH_URL : undefined;

  if (previewUrl) {
    return `https://${previewUrl}`;
  }

  if (env.VITE_BASE_URL && (env.DEV || !isLocalBaseUrl(env.VITE_BASE_URL))) {
    return env.VITE_BASE_URL;
  }

  return publicBaseUrlFallback;
};

const buildAbsoluteUrl = (path: string) => {
  const normalizedBaseUrl = normalizeBaseUrl(resolveConfiguredBaseUrl());
  const normalizedPath = normalizePath(path);

  return `${normalizedBaseUrl}${normalizedPath}`;
};

export const buildPublicAbsoluteUrl = buildAbsoluteUrl;

const buildPublicAppOffers = () =>
  fallbackPublicTokenPacks.map((tokenPack) => ({
    "@type": "Offer",
    name: tokenPack.name,
    price: (tokenPack.priceAmountCents / 100).toFixed(2),
    priceCurrency: tokenPack.currency,
    availability: "https://schema.org/InStock",
    category: tokenPack.priceAmountCents === 0 ? "FreeTrial" : "Subscription",
    description:
      tokenPack.description ??
      `${formatCurrency(tokenPack.priceAmountCents, tokenPack.currency)} monthly Nayovi plan for manga, manhwa, and manhua translation on Android.`,
    url:
      tokenPack.priceAmountCents === 0
        ? buildAbsoluteUrl("/")
        : buildAbsoluteUrl("/pricing"),
  }));

export const buildPublicFaqStructuredData = (
  path: string,
  faqs: readonly { description: string; title: string }[],
) => {
  if (faqs.length === 0) {
    return [];
  }

  return [
    {
      "@type": "FAQPage",
      "@id": `${buildAbsoluteUrl(path)}#faq`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.title,
        acceptedAnswer: {
          "@type": "Answer",
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
  extraGraph: readonly Record<string, unknown>[] = [],
) => {
  const baseUrl = buildAbsoluteUrl("/");
  const organizationId = `${baseUrl}#organization`;
  const websiteId = `${baseUrl}#website`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: publicSiteName,
        alternateName: publicBrandAliases,
        url: baseUrl,
        sameAs: [publicBrandUrl, publicSeoUrl],
        logo: buildAbsoluteUrl("/nayovi-mark-light.png"),
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "contact@nayovi.com",
            url: buildAbsoluteUrl("/support"),
            availableLanguage: ["en", "fr"],
          },
          {
            "@type": "ContactPoint",
            contactType: "partnerships and review access",
            email: "contact@nayovi.com",
            url: buildAbsoluteUrl(
              "/guides/permission-safe-manga-translation-pilot",
            ),
            availableLanguage: ["en", "fr"],
          },
        ],
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "Nayovi Manhwa and Manga Translator",
        alternateName: publicBrandAliases,
        url: baseUrl,
        sameAs: [publicBrandUrl, publicSeoUrl],
        description: publicSiteDescription,
        inLanguage: "en",
        publisher: {
          "@id": organizationId,
        },
      },
      {
        "@type": "WebPage",
        "@id": `${url}#webpage`,
        name: title,
        url,
        description,
        image: imageUrl,
        isPartOf: {
          "@id": websiteId,
        },
        inLanguage: "en",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${baseUrl}#android-app`,
        name: publicSiteName,
        alternateName: publicBrandAliases,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Android",
        url: buildAbsoluteUrl("/download"),
        description: publicSiteDescription,
        offers: buildPublicAppOffers(),
      },
      ...extraGraph,
    ],
  };
};

const buildPublicTitle = (
  pageTitle: string,
  titleSuffix = "Nayovi Manga Translator",
) => `${pageTitle} | ${titleSuffix}`;

export const buildPublicNotFoundHead = (
  pageTitle: string,
  description: string,
) => ({
  links: [],
  meta: [
    {
      title: buildPublicTitle(pageTitle),
    },
    {
      name: "description",
      content: description,
    },
    {
      name: "robots",
      content: "noindex, nofollow",
    },
  ],
});

export const buildPublicPageHead = (
  pageTitle: string,
  description: string,
  path: string,
  options?: {
    keywords?: readonly string[];
    imageAlt?: string;
    imageHeight?: number | string;
    imagePath?: string;
    imageType?: string;
    imageWidth?: number | string;
    structuredDataGraph?: readonly Record<string, unknown>[];
    titleSuffix?: string;
    robots?: string;
    type?: string | null;
  },
) => {
  const title = buildPublicTitle(pageTitle, options?.titleSuffix);
  const url = buildAbsoluteUrl(path);
  const imageUrl = toAbsoluteAssetUrl(options?.imagePath ?? socialImagePath);
  const imageAlt =
    options?.imageAlt ??
    "Nayovi free manga, manhwa, and manhua AI translator preview.";
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
    options?.structuredDataGraph,
  );

  return {
    meta: [
      {
        title,
      },
      {
        name: "description",
        content: description,
      },
      {
        name: "robots",
        content: options?.robots ?? "index, follow, max-image-preview:large",
      },
      ...(keywords.length > 0
        ? [
            {
              name: "keywords",
              content: keywords.join(", "),
            },
          ]
        : []),
      {
        name: "application-name",
        content: publicSiteName,
      },
      {
        property: "og:site_name",
        content: publicSiteName,
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:locale",
        content: "en_US",
      },
      {
        property: "og:title",
        content: title,
      },
      {
        property: "og:description",
        content: description,
      },
      {
        property: "og:url",
        content: url,
      },
      {
        property: "og:image",
        content: imageUrl,
      },
      {
        property: "og:image:secure_url",
        content: imageUrl,
      },
      {
        property: "og:image:type",
        content: options?.imageType ?? "image/jpeg",
      },
      {
        property: "og:image:width",
        content: String(options?.imageWidth ?? 1200),
      },
      {
        property: "og:image:height",
        content: String(options?.imageHeight ?? 630),
      },
      {
        property: "og:image:alt",
        content: imageAlt,
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "twitter:title",
        content: title,
      },
      {
        name: "twitter:description",
        content: description,
      },
      {
        name: "twitter:image",
        content: imageUrl,
      },
      {
        name: "twitter:image:alt",
        content: imageAlt,
      },
      {
        "script:ld+json": structuredData,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: url,
      },
    ],
  };
};

export const buildPublicBlogIndexHead = (
  page = 1,
): ReturnType<
  typeof buildPublicPageHead
> => {
  const description =
    "Read practical Nayovi guides for translating manhwa, manga, and manhua on Android, installing the APK, and choosing a simple reading workflow.";
  const isFirstPage = page <= 1;
  const pageTitle = isFirstPage
    ? "Manhwa, Manga & Manhua Translation Guides"
    : `Manhwa & Manga Translation Guides - Page ${page}`;
  const canonicalPath = isFirstPage ? "/blog" : `/blog?page=${page}`;

  return buildPublicPageHead(
    pageTitle,
    description,
    canonicalPath,
    {
      keywords: highIntentBlogSeoKeywords,
      titleSuffix: "Nayovi",
    },
  );
};

export const buildPublicBlogArticleHead = (
  article: BlogArticleDetail,
): ReturnType<typeof buildPublicPageHead> => {
  const seoTitle = buildConciseBlogArticleTitle(article);
  const baseHead = buildPublicPageHead(
    seoTitle,
    article.metaDescription,
    `/blog/${article.slug}`,
    {
      imageAlt: `${article.title} hero image for Nayovi ${article.manhwaType} AI translation.`,
      imagePath: article.heroImageUrl ?? undefined,
      imageType: article.heroImageUrl ? "image/png" : undefined,
      keywords: article.keywords,
      structuredDataGraph: buildArticleStructuredData(article),
      titleSuffix: "Nayovi",
      type: article.manhwaType,
    },
  );
  const keywords = buildBlogSeoKeywords(article.keywords, {
    type: article.manhwaType,
  });

  return {
    ...baseHead,
    meta: [
      ...baseHead.meta.filter(
        (entry) => !("property" in entry) || entry.property !== "og:type",
      ),
      {
        property: "og:type",
        content: "article",
      },
      {
        property: "article:published_time",
        content: article.publishedAt,
      },
      {
        property: "article:modified_time",
        content: article.updatedAt,
      },
      {
        property: "article:section",
        content: article.manhwaType,
      },
      ...keywords.slice(0, 8).map((keyword) => ({
        property: "article:tag",
        content: keyword,
      })),
    ],
  };
};

const buildConciseBlogArticleTitle = (article: BlogArticleDetail) => {
  const publishedDate = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(article.publishedAt));

  if (article.manhwaTitle.trim().toLowerCase() === "nayovi") {
    return `Android Manhwa Translation Guide · ${publishedDate}`;
  }

  const articleType = formatBlogArticleType(article.manhwaType);
  const titleTail = ` ${articleType} Translation · ${publishedDate}`;
  const titleSuffixLength = " | Nayovi".length;
  const subjectMaxLength = Math.max(
    8,
    60 - titleSuffixLength - titleTail.length,
  );
  const subject = truncateAtWord(article.manhwaTitle.trim(), subjectMaxLength);

  return `${subject}${titleTail}`;
};

const formatBlogArticleType = (value: string) => {
  const normalizedValue = value.trim().toLowerCase();

  if (["manga", "manhua", "manhwa"].includes(normalizedValue)) {
    return `${normalizedValue.charAt(0).toUpperCase()}${normalizedValue.slice(1)}`;
  }

  return "Comic";
};

const truncateAtWord = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  const truncated = value.slice(0, Math.max(1, maxLength - 1));
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  const wordSafeValue =
    lastSpaceIndex >= Math.floor(maxLength / 2)
      ? truncated.slice(0, lastSpaceIndex)
      : truncated;

  return `${wordSafeValue.trimEnd()}…`;
};

const buildArticleStructuredData = (article: BlogArticleDetail) => {
  const articleUrl = buildAbsoluteUrl(`/blog/${article.slug}`);
  const imageUrl = article.heroImageUrl
    ? toAbsoluteAssetUrl(article.heroImageUrl)
    : buildAbsoluteUrl(socialImagePath);
  const baseUrl = buildAbsoluteUrl("/");
  const graph: Record<string, unknown>[] = [
    {
      "@type": "BlogPosting",
      "@id": `${articleUrl}#article`,
      headline: article.title,
      description: article.metaDescription,
      image: imageUrl,
      datePublished: article.publishedAt,
      dateModified: article.updatedAt,
      articleSection: article.manhwaType,
      keywords: buildBlogSeoKeywords(article.keywords, {
        limit: 12,
        type: article.manhwaType,
      }).join(", "),
      mainEntityOfPage: {
        "@id": `${articleUrl}#webpage`,
      },
      publisher: {
        "@id": `${baseUrl}#organization`,
      },
    },
  ];

  if (article.body.faqs.length > 0) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${articleUrl}#faq`,
      mainEntity: article.body.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
  }

  return graph;
};
