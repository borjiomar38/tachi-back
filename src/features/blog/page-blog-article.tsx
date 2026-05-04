import {
  ArrowLeftIcon,
  BookMarkedIcon,
  CheckCircle2Icon,
  DownloadIcon,
  ShieldCheckIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import heroBackground from '@/features/auth/layout-login-background.webp';
import heroCharacter from '@/features/auth/layout-login-character.webp';
import { BlogProfileLine } from '@/features/blog/blog-profile-line';
import { BlogArticleDetail } from '@/features/blog/schema';
import { androidApkDownload } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

interface PageBlogArticleProps {
  article: BlogArticleDetail;
}

export const PageBlogArticle = ({ article }: PageBlogArticleProps) => {
  const hasGeneratedHeroImage = Boolean(article.heroImageUrl);

  return (
    <PublicShell>
      <article>
        <section className="mx-auto w-full max-w-6xl px-4 pt-7 md:pt-10">
          <div className="public-ink-panel relative isolate min-h-[34rem] overflow-hidden rounded-[1.75rem] border px-5 py-8 text-neutral-50 md:min-h-[36rem] md:px-8 md:py-10">
            <img
              src={article.heroImageUrl ?? heroBackground}
              alt={hasGeneratedHeroImage ? article.imageAlt : ''}
              className={cn(
                'absolute inset-0 -z-20 size-full object-cover transition',
                hasGeneratedHeroImage
                  ? 'object-[68%_center] opacity-90'
                  : 'object-[62%_center] opacity-45'
              )}
            />
            <div
              className={cn(
                'absolute inset-0 -z-10',
                hasGeneratedHeroImage
                  ? 'bg-linear-to-r from-neutral-950 via-neutral-950/78 to-neutral-950/10'
                  : 'bg-linear-to-r from-neutral-950 via-neutral-950/88 to-neutral-950/42'
              )}
            />
            {!hasGeneratedHeroImage ? (
              <img
                src={heroCharacter}
                alt=""
                className="animate-float-in-space pointer-events-none absolute right-[-5rem] bottom-[-7rem] hidden w-[min(28rem,44%)] opacity-92 drop-shadow-[0_30px_56px_rgba(0,0,0,0.55)] md:block"
              />
            ) : null}
            <div className="max-w-3xl space-y-5">
              <a
                href="/blog"
                className="inline-flex items-center gap-2 text-sm text-neutral-300 transition hover:text-neutral-50"
              >
                <ArrowLeftIcon className="size-4" />
                Blog
              </a>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="brand"
                  size="lg"
                  className="border-white/15 bg-white/10 text-neutral-50"
                >
                  {article.manhwaType}
                </Badge>
                <Badge
                  variant="secondary"
                  size="lg"
                  className="border-white/15 bg-white/10 text-neutral-50"
                >
                  {article.manhwaTitle}
                </Badge>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-semibold tracking-[0.22em] text-brand-100 uppercase">
                  {formatArticleDate(article.publishedAt)}
                </p>
                <h1 className="text-4xl leading-tight font-semibold tracking-normal text-balance md:text-6xl">
                  {article.title}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-neutral-200 md:text-lg">
                  {article.excerpt}
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
          title="Reader guide"
          description={article.body.introduction}
          className="pb-8"
        >
          <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
            <aside className="space-y-4">
              <Card className="public-brand-panel-muted rounded-[1.5rem]">
                <CardContent className="grid gap-4 p-5">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <BookMarkedIcon className="size-5" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-xl font-semibold">Reading profile</h2>
                    <BlogProfileLine
                      label="Tone"
                      value={article.body.readingProfile.tone}
                    />
                    <BlogProfileLine
                      label="Pacing"
                      value={article.body.readingProfile.pacing}
                    />
                    <BlogProfileLine
                      label="Best for"
                      value={article.body.readingProfile.bestFor}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="public-ink-panel rounded-[1.5rem] text-neutral-50">
                <CardContent className="grid gap-4 p-5">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-300 text-brand-950">
                    <DownloadIcon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold">
                      {article.body.downloadCallout.title}
                    </h2>
                    <p className="text-sm leading-6 text-neutral-300">
                      {article.body.downloadCallout.body}
                    </p>
                  </div>
                  <a
                    href={androidApkDownload.href}
                    className={cn(
                      buttonVariants({ variant: 'default', size: 'lg' }),
                      'w-full justify-center bg-brand-300 text-brand-950 hover:bg-brand-200'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {article.body.downloadCallout.buttonLabel}
                      <DownloadIcon className="size-4" />
                    </span>
                  </a>
                </CardContent>
              </Card>
            </aside>

            <div className="space-y-4">
              {article.body.sections.map((section) => (
                <section
                  key={section.heading}
                  className="rounded-[1.5rem] border border-border/80 bg-card/88 p-5 md:p-6"
                >
                  <div className="space-y-3">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {section.heading}
                    </h2>
                    <p className="leading-7 text-muted-foreground">
                      {section.body}
                    </p>
                  </div>
                  <div className="mt-5 grid gap-2">
                    {section.takeaways.map((takeaway) => (
                      <div
                        key={takeaway}
                        className="flex gap-2 rounded-xl border border-border/70 bg-background/55 px-3 py-3 text-sm text-muted-foreground"
                      >
                        <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{takeaway}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </PublicSection>

        <PublicSection
          eyebrow="FAQ"
          title="Common questions"
          description="Short answers for readers who arrive from manhwa, manhua, manga translation, or Tachiyomi download searches."
          className="pt-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {article.body.faqs.map((faq) => (
              <Card key={faq.question} className="rounded-[1.5rem]">
                <CardContent className="grid gap-3 p-5">
                  <h2 className="text-lg font-semibold">{faq.question}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </PublicSection>

        <PublicSection
          title="Rights and reading safety"
          description={article.body.disclaimer}
          className="pt-0 pb-20"
        >
          <div className="public-brand-panel-muted flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border p-5">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <ShieldCheckIcon className="size-5" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">Official TachiyomiAT download</p>
                <p className="text-sm text-muted-foreground">
                  Use the official APK path and avoid random reposted builds.
                </p>
              </div>
            </div>
            <a
              href={androidApkDownload.href}
              className={buttonVariants({ variant: 'default', size: 'lg' })}
            >
              <span className="flex items-center gap-2">
                Download TachiyomiAT
                <DownloadIcon className="size-4" />
              </span>
            </a>
          </div>
        </PublicSection>
      </article>
    </PublicShell>
  );
};

function formatArticleDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}
