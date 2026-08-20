import { ArrowLeftIcon, DownloadIcon, ExternalLinkIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import { BlogDefaultHeroVisual } from '@/features/blog/blog-default-hero-visual';
import { getBlogCategoryPath } from '@/features/blog/category';
import { buildBlogHeroImageVariantUrl } from '@/features/blog/image-variants';
import {
  blogArticleCategoryLabels,
  type BlogArticleDetail,
  type EditorialBlogArticleBody,
} from '@/features/blog/schema';
import { androidApkDownload } from '@/features/public/download-assets';
import { PublicShell } from '@/features/public/public-shell';

export interface BlogEditorialArticleData extends BlogArticleDetail {
  body: EditorialBlogArticleBody;
}

export interface BlogEditorialArticleProps {
  article: BlogEditorialArticleData;
}

interface BlogEditorialHeroProps {
  article: BlogEditorialArticleData;
}

interface BlogEditorialBodyProps {
  article: BlogEditorialArticleData;
}

export const BlogEditorialArticle = ({
  article,
}: BlogEditorialArticleProps) => (
  <PublicShell>
    <article className="pb-20">
      <BlogEditorialHero article={article} />
      <BlogEditorialBody article={article} />
    </article>
  </PublicShell>
);

export const BlogEditorialHero = ({ article }: BlogEditorialHeroProps) => {
  const responsiveImage = article.heroImageUrl
    ? buildArticleImageSources(article.heroImageUrl)
    : null;

  return (
    <header className="relative isolate min-h-[34rem] w-full overflow-hidden border-y border-white/10 bg-neutral-950 text-neutral-50 md:min-h-[38rem]">
      {article.heroImageUrl ? (
        <>
          <img
            src={article.heroImageUrl}
            srcSet={responsiveImage?.srcSet}
            sizes={responsiveImage?.sizes}
            alt={article.imageAlt}
            width={1_642}
            height={958}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 -z-20 size-full object-cover object-[68%_center] opacity-95"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral-950 via-neutral-950/82 to-neutral-950/18" />
          <div className="absolute inset-0 -z-10 bg-linear-to-t from-neutral-950/55 via-transparent to-neutral-950/20" />
        </>
      ) : (
        <BlogDefaultHeroVisual />
      )}
      <div className="mx-auto flex min-h-[34rem] w-full max-w-6xl items-center px-4 py-10 md:min-h-[38rem] md:py-14">
        <div className="max-w-3xl space-y-5 lg:max-w-[56%]">
          <a
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-neutral-300 transition hover:text-neutral-50"
          >
            <ArrowLeftIcon className="size-4" />
            Blog
          </a>
          <a
            href={getBlogCategoryPath(article.body.category)}
            aria-label={`Browse ${blogArticleCategoryLabels[article.body.category]} articles`}
            className="flex w-fit rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Badge
              variant="brand"
              size="lg"
              className="border-white/15 bg-white/10 text-neutral-50 transition hover:bg-white/20"
            >
              {blogArticleCategoryLabels[article.body.category]}
            </Badge>
          </a>
          <p className="text-sm font-semibold tracking-[0.18em] text-brand-100 uppercase">
            {formatArticleDate(article.publishedAt)}
          </p>
          <h1 className="text-4xl leading-tight font-semibold tracking-normal text-balance md:text-6xl">
            {article.title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
            {article.body.introduction}
          </p>
        </div>
      </div>
    </header>
  );
};

export const BlogEditorialBody = ({ article }: BlogEditorialBodyProps) => (
  <div className="mx-auto w-full max-w-3xl px-4 pt-9 md:pt-12">
    <div className="space-y-10 pb-9">
      {article.body.sections.map((section) => (
        <section key={section.heading} className="space-y-4">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph}
              className="text-base leading-8 text-foreground/88"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>

    <BlogEditorialCallout article={article} />
    <BlogEditorialSources article={article} />
    <BlogEditorialFaq article={article} />

    <p className="mt-8 rounded-2xl border border-border/70 bg-card/60 px-5 py-4 text-sm leading-6 text-muted-foreground">
      {article.body.disclaimer}
    </p>
  </div>
);

export const BlogEditorialCallout = ({ article }: BlogEditorialBodyProps) => (
  <aside className="public-brand-panel-muted flex flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
    <div className="space-y-1.5">
      <h2 className="text-lg font-semibold">
        {article.body.downloadCallout.title}
      </h2>
      <p className="max-w-xl text-sm leading-6 text-muted-foreground">
        {article.body.downloadCallout.body}
      </p>
    </div>
    <a
      href={androidApkDownload.href}
      className={cn(
        buttonVariants({ variant: 'default', size: 'lg' }),
        'shrink-0'
      )}
    >
      <span className="flex items-center gap-2">
        {article.body.downloadCallout.buttonLabel}
        <DownloadIcon className="size-4" />
      </span>
    </a>
  </aside>
);

export const BlogEditorialSources = ({ article }: BlogEditorialBodyProps) => (
  <section className="mt-10 space-y-4">
    <h2 className="text-xl font-semibold">Sources</h2>
    <ul className="space-y-2 text-sm text-muted-foreground">
      {article.body.sources.map((source) => (
        <li key={source.url}>
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-start gap-2 underline decoration-border underline-offset-4 transition hover:text-foreground"
          >
            <span>
              {source.title}
              {source.publishedAt ? ` · ${source.publishedAt}` : ''}
            </span>
            <ExternalLinkIcon className="mt-0.5 size-3.5 shrink-0" />
          </a>
        </li>
      ))}
    </ul>
  </section>
);

export const BlogEditorialFaq = ({ article }: BlogEditorialBodyProps) => {
  if (article.body.faqs.length === 0) {
    return null;
  }

  return (
    <section className="mt-10 space-y-5 border-t border-border/70 pt-8">
      <h2 className="text-xl font-semibold">Questions about this update</h2>
      {article.body.faqs.map((faq) => (
        <div key={faq.question} className="space-y-2">
          <h3 className="font-semibold">{faq.question}</h3>
          <p className="text-sm leading-7 text-muted-foreground">
            {faq.answer}
          </p>
        </div>
      ))}
    </section>
  );
};

function buildArticleImageSources(sourceUrl: string) {
  const mediumUrl = buildBlogHeroImageVariantUrl({
    sourceUrl,
    variant: 'article-md',
  });
  const largeUrl = buildBlogHeroImageVariantUrl({
    sourceUrl,
    variant: 'article-lg',
  });

  if (!mediumUrl || !largeUrl) {
    return null;
  }

  return {
    sizes: '(min-width: 1152px) 1088px, calc(100vw - 2rem)',
    srcSet: `${mediumUrl} 960w, ${largeUrl} 1440w`,
  };
}

function formatArticleDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
