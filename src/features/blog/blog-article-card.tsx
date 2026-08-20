import { ArrowRightIcon, BookOpenTextIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import heroBackground from '@/features/auth/layout-login-background.webp';
import heroCharacter from '@/features/auth/layout-login-character.webp';
import { getBlogCategoryPath } from '@/features/blog/category';
import { buildBlogHeroImageVariantUrl } from '@/features/blog/image-variants';
import {
  blogArticleCategoryLabels,
  BlogArticleSummary,
} from '@/features/blog/schema';

interface BlogArticleCardProps {
  article: BlogArticleSummary;
}

export const BlogArticleCard = ({ article }: BlogArticleCardProps) => {
  const formattedDate = formatArticleDate(article.publishedAt);
  const hasGeneratedHeroImage = Boolean(article.heroImageUrl);
  const responsiveImage = article.heroImageUrl
    ? buildCardImageSources(article.heroImageUrl)
    : null;

  return (
    <Card className="group overflow-hidden rounded-[1.5rem] border-border/80 bg-card/88 transition hover:border-primary/55">
      <CardContent className="grid gap-5 p-5">
        <div className="relative min-h-44 overflow-hidden rounded-[1.15rem] border border-white/10 bg-neutral-950">
          <img
            src={article.heroImageUrl ?? heroBackground}
            srcSet={responsiveImage?.srcSet}
            sizes={responsiveImage?.sizes}
            alt={hasGeneratedHeroImage ? article.imageAlt : ''}
            width={768}
            height={432}
            loading="lazy"
            decoding="async"
            className={
              hasGeneratedHeroImage
                ? 'absolute inset-0 size-full object-cover opacity-90 transition duration-500 group-hover:scale-[1.03]'
                : 'absolute inset-0 size-full object-cover opacity-38'
            }
          />
          <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-neutral-950/58 to-neutral-950/8" />
          {!hasGeneratedHeroImage ? (
            <img
              src={heroCharacter}
              alt=""
              width={1_024}
              height={1_536}
              loading="lazy"
              decoding="async"
              className="animate-float-in-space absolute right-[-1.5rem] bottom-[-3rem] w-44 opacity-90"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 p-4">
            {article.category ? (
              <a
                href={getBlogCategoryPath(article.category)}
                aria-label={`Browse ${blogArticleCategoryLabels[article.category]} articles`}
                className="inline-flex rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Badge
                  variant="brand"
                  size="sm"
                  className="border-white/15 bg-white/10 text-neutral-50 transition hover:bg-white/20"
                >
                  {blogArticleCategoryLabels[article.category]}
                </Badge>
              </a>
            ) : (
              <Badge
                variant="brand"
                size="sm"
                className="border-white/15 bg-white/10 text-neutral-50"
              >
                {article.manhwaType}
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <BookOpenTextIcon className="size-3.5" />
              {article.manhwaTitle}
            </span>
            <span>{formattedDate}</span>
          </div>
          <a href={`/blog/${article.slug}`} className="block">
            <h2 className="text-xl font-semibold tracking-tight text-foreground transition group-hover:text-primary">
              {article.title}
            </h2>
          </a>
          <p className="text-sm leading-6 text-muted-foreground">
            {article.excerpt}
          </p>
        </div>
        <div className="flex justify-end">
          <a
            href={`/blog/${article.slug}`}
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <span className="flex items-center gap-2">
              Read
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

function buildCardImageSources(sourceUrl: string) {
  const smallUrl = buildBlogHeroImageVariantUrl({
    sourceUrl,
    variant: 'card-sm',
  });
  const largeUrl = buildBlogHeroImageVariantUrl({
    sourceUrl,
    variant: 'card-lg',
  });

  if (!smallUrl || !largeUrl) {
    return null;
  }

  return {
    sizes: '(min-width: 768px) calc(50vw - 2.5rem), calc(100vw - 2.5rem)',
    srcSet: `${smallUrl} 480w, ${largeUrl} 768w`,
  };
}

function formatArticleDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}
