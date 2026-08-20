import { ArrowLeftIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import { BlogArticleCard } from '@/features/blog/blog-article-card';
import { BlogCategoryHeroVisual } from '@/features/blog/blog-category-hero-visual';
import {
  type BlogCategoryConfig,
  blogCategoryConfigs,
  getBlogCategoryPath,
} from '@/features/blog/category';
import { BlogPagination } from '@/features/blog/page-blog-index';
import type {
  BlogArticlePagination,
  BlogArticleSummary,
} from '@/features/blog/schema';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

interface PageBlogCategoryProps {
  articles: BlogArticleSummary[];
  category: BlogCategoryConfig;
  pagination: BlogArticlePagination;
}

export const PageBlogCategory = ({
  articles,
  category,
  pagination,
}: PageBlogCategoryProps) => {
  const categoryPath = getBlogCategoryPath(category.category);

  return (
    <PublicShell>
      <section className="relative isolate min-h-[34rem] w-full overflow-hidden border-y border-white/10 bg-neutral-950 text-neutral-50 md:min-h-[38rem]">
        <BlogCategoryHeroVisual category={category.category} />
        <div className="mx-auto flex min-h-[34rem] w-full max-w-6xl items-center px-4 py-10 md:min-h-[38rem] md:py-14">
          <div className="max-w-3xl space-y-5 lg:max-w-[56%]">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-sm text-neutral-300"
            >
              <a
                href="/blog"
                className="inline-flex items-center gap-2 transition hover:text-neutral-50"
              >
                <ArrowLeftIcon className="size-4" />
                Blog
              </a>
              <span aria-hidden="true">/</span>
              <span className="text-neutral-50">{category.label}</span>
            </nav>
            <Badge
              variant="brand"
              size="lg"
              className="border-white/15 bg-white/10 text-neutral-50"
            >
              {category.label}
            </Badge>
            <h1 className="text-4xl leading-tight font-semibold tracking-normal text-balance md:text-6xl">
              {category.title}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
              {category.description}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4">
        <nav
          aria-label="Blog categories"
          className="mt-5 flex flex-wrap gap-2 border-b border-border/70 pb-5"
        >
          {blogCategoryConfigs.map((item) => {
            const isActive = item.category === category.category;

            return (
              <a
                key={item.category}
                href={getBlogCategoryPath(item.category)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  buttonVariants({
                    size: 'sm',
                    variant: isActive ? 'default' : 'secondary',
                  }),
                  'rounded-full'
                )}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </section>

      <PublicSection
        eyebrow={category.label}
        title={`Latest ${category.label.toLowerCase()}`}
        description={`Browse every published Nayovi article in the ${category.label.toLowerCase()} category.`}
        className="pb-20"
      >
        {articles.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {articles.map((article) => (
              <BlogArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-border/80 bg-card/70 p-8 text-center">
            <h2 className="text-xl font-semibold">No published articles yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              New {category.label.toLowerCase()} will appear here after they are
              published.
            </p>
          </div>
        )}
        <BlogPagination basePath={categoryPath} pagination={pagination} />
      </PublicSection>
    </PublicShell>
  );
};
