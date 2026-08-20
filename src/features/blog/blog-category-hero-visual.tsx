import appUpdatesHero from '@/features/blog/blog-category-app-updates-hero.webp';
import manhwaNewsHero from '@/features/blog/blog-category-manhwa-news-hero.webp';
import recommendationsHero from '@/features/blog/blog-category-recommendations-hero.webp';
import type { BlogArticleCategory } from '@/features/blog/schema';

const blogCategoryHeroImages = {
  app_updates: {
    height: 887,
    src: appUpdatesHero,
    width: 1_774,
  },
  manhwa_news: {
    height: 931,
    src: manhwaNewsHero,
    width: 1_690,
  },
  recommendations: {
    height: 867,
    src: recommendationsHero,
    width: 1_815,
  },
} as const satisfies Record<
  BlogArticleCategory,
  { height: number; src: string; width: number }
>;

export const BlogCategoryHeroVisual = ({
  category,
}: {
  category: BlogArticleCategory;
}) => {
  const image = blogCategoryHeroImages[category];

  return (
    <>
      <img
        src={image.src}
        alt=""
        width={image.width}
        height={image.height}
        loading="eager"
        decoding="async"
        fetchPriority="high"
        className="absolute inset-0 -z-20 size-full object-cover object-[72%_center] opacity-95 md:object-center"
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral-950 via-neutral-950/88 to-neutral-950/42" />
      <div className="absolute inset-0 -z-10 bg-linear-to-t from-neutral-950/45 via-transparent to-neutral-950/15" />
    </>
  );
};
