import { DownloadIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import heroBackground from '@/features/auth/layout-login-background.webp';
import heroCharacter from '@/features/auth/layout-login-character.webp';
import { BlogArticleCard } from '@/features/blog/blog-article-card';
import { BlogArticleSummary } from '@/features/blog/schema';
import { androidApkDownload } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

interface PageBlogIndexProps {
  articles: BlogArticleSummary[];
}

export const PageBlogIndex = ({ articles }: PageBlogIndexProps) => {
  return (
    <PublicShell>
      <section className="mx-auto w-full max-w-6xl px-4 pt-7 md:pt-10">
        <div className="public-ink-panel relative isolate overflow-hidden rounded-[1.75rem] border px-5 py-8 text-neutral-50 md:px-8 md:py-10">
          <img
            src={heroBackground}
            alt=""
            className="absolute inset-0 -z-20 size-full object-cover object-[62%_center] opacity-42"
          />
          <div className="absolute inset-0 -z-10 bg-linear-to-r from-neutral-950 via-neutral-950/88 to-neutral-950/45" />
          <img
            src={heroCharacter}
            alt=""
            className="animate-float-in-space pointer-events-none absolute right-[-5rem] bottom-[-7rem] hidden w-[min(26rem,42%)] opacity-92 drop-shadow-[0_30px_56px_rgba(0,0,0,0.55)] md:block"
          />
          <div className="max-w-3xl space-y-5">
            <Badge
              variant="brand"
              size="lg"
              className="border-white/15 bg-white/10 text-neutral-50"
            >
              Manhwa blog
            </Badge>
            <div className="space-y-3">
              <h1 className="text-4xl leading-tight font-semibold tracking-normal text-balance md:text-6xl">
                Manhwa, manhua, and manga translation guides.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                Search-friendly articles about reading workflows, hosted OCR,
                translation quality, and the official TachiyomiAT Android
                download.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={androidApkDownload.href}
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'bg-brand-300 text-brand-950 hover:bg-brand-200'
                )}
              >
                <span className="flex items-center gap-2">
                  Download TachiyomiAT
                  <DownloadIcon className="size-4" />
                </span>
              </a>
              <a
                href="/download"
                className={cn(
                  buttonVariants({ variant: 'secondary', size: 'lg' }),
                  'border-white/20 bg-white/10 text-neutral-50 hover:bg-white/15'
                )}
              >
                Install guide
              </a>
            </div>
          </div>
        </div>
      </section>

      <PublicSection
        eyebrow="Articles"
        title="Latest TachiyomiAT reading guides"
        description="Fresh reading notes for manhwa, manhua, manga translation, Android setup, and the official TachiyomiAT APK."
        className="pb-20"
      >
        <div className="grid gap-4 md:grid-cols-2">
          {articles.map((article) => (
            <BlogArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </PublicSection>
    </PublicShell>
  );
};
