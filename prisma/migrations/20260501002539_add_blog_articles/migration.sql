-- CreateEnum
CREATE TYPE "BlogArticleStatus" AS ENUM ('draft', 'published', 'failed');

-- CreateTable
CREATE TABLE "blog_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "manhwaTitle" TEXT NOT NULL,
    "manhwaType" TEXT NOT NULL DEFAULT 'manhwa',
    "searchIntent" TEXT NOT NULL,
    "keywords" TEXT[],
    "imagePrompt" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL,
    "heroImageUrl" TEXT,
    "heroImageObjectKey" TEXT,
    "body" JSONB NOT NULL,
    "imageReview" JSONB,
    "uxReview" JSONB,
    "generationKey" TEXT,
    "generationPromptVersion" TEXT NOT NULL,
    "generationProvider" "ProviderType",
    "generationModel" TEXT,
    "generationSource" TEXT NOT NULL DEFAULT 'manual',
    "status" "BlogArticleStatus" NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blog_articles_slug_key" ON "blog_articles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "blog_articles_generationKey_key" ON "blog_articles"("generationKey");

-- CreateIndex
CREATE INDEX "blog_articles_status_publishedAt_idx" ON "blog_articles"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "blog_articles_manhwaTitle_idx" ON "blog_articles"("manhwaTitle");
