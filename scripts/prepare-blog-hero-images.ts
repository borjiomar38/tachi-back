import {
  buildBlogTopicHeroImageAlt,
  buildBlogTopicHeroImagePrompt,
  generatePrebuiltBlogHeroImage,
} from '@/server/blog/images';
import {
  combineBlogImageReviews,
  runAnimeMangaImageReviewAgent,
  runHeroImageUxReviewAgent,
} from '@/server/blog/review-agents';
import {
  BlogGenerationTopic,
  blogGenerationTopics,
} from '@/server/blog/topics';
import { db } from '@/server/db';

const force = process.argv.includes('--force');
const nextCountArg = process.argv.find((arg) => arg.startsWith('--next='));
const nextCount = nextCountArg ? Number(nextCountArg.split('=')[1]) : 10;

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dateOffset(date: string) {
  return date
    .split('-')
    .join('')
    .split('')
    .reduce((total, digit) => total + Number(digit), 0);
}

function topicKey(topic: BlogGenerationTopic) {
  return `${topic.manhwaType}:${topic.manhwaTitle}`;
}

function topicFromArticle(row: {
  manhwaTitle: string;
  manhwaType: string;
  searchIntent: string;
}): BlogGenerationTopic {
  return (
    blogGenerationTopics.find(
      (topic) =>
        topic.manhwaTitle === row.manhwaTitle &&
        topic.manhwaType === row.manhwaType
    ) ?? {
      angle: `Create a visual translation workflow article image for ${row.manhwaTitle}.`,
      manhwaTitle: row.manhwaTitle,
      manhwaType:
        row.manhwaType === 'manga' ||
        row.manhwaType === 'manhua' ||
        row.manhwaType === 'manhwa'
          ? row.manhwaType
          : 'manhwa',
      searchIntent: row.searchIntent,
    }
  );
}

async function getNextCronTopics(count: number) {
  const existingGenerationKeys = new Set(
    (
      await db.blogArticle.findMany({
        select: {
          generationKey: true,
        },
        where: {
          generationSource: 'daily-cron',
          generationKey: {
            not: null,
          },
        },
      })
    ).map((row) => row.generationKey)
  );
  let simulatedArticleCount = await db.blogArticle.count({
    where: {
      generationSource: 'daily-cron',
    },
  });
  const topics: BlogGenerationTopic[] = [];
  const today = new Date();

  for (let dayDelta = 0; topics.length < count && dayDelta < 90; dayDelta++) {
    const key = dateKey(addDays(today, dayDelta));

    if (existingGenerationKeys.has(`daily-blog-${key}`)) {
      continue;
    }

    const topic =
      blogGenerationTopics[
        (simulatedArticleCount + dateOffset(key)) % blogGenerationTopics.length
      ];

    if (!topic) {
      throw new Error('Unable to select a future blog topic.');
    }

    topics.push(topic);
    simulatedArticleCount += 1;
  }

  return topics;
}

const currentArticles = await db.blogArticle.findMany({
  orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  select: {
    id: true,
    manhwaTitle: true,
    manhwaType: true,
    searchIntent: true,
    slug: true,
  },
});
const topicMap = new Map<string, BlogGenerationTopic>();

for (const article of currentArticles) {
  const topic = topicFromArticle(article);
  topicMap.set(topicKey(topic), topic);
}

for (const topic of await getNextCronTopics(nextCount)) {
  topicMap.set(topicKey(topic), topic);
}

const prepared: Array<{
  heroImageUrl: string;
  reviewScore: number;
  title: string;
}> = [];

for (const topic of topicMap.values()) {
  const imagePrompt = buildBlogTopicHeroImagePrompt(topic);
  const imageAlt = buildBlogTopicHeroImageAlt(topic);
  const review = combineBlogImageReviews([
    runAnimeMangaImageReviewAgent({
      imageAlt,
      imagePrompt,
      topic,
    }),
    runHeroImageUxReviewAgent({
      imagePrompt,
    }),
  ]);

  if (!review.passed) {
    throw new Error(
      `Image prompt review failed for ${topic.manhwaTitle}: ${review.notes.join(
        ' '
      )}`
    );
  }

  const image = await generatePrebuiltBlogHeroImage({
    force,
    topic,
  });

  await db.blogArticle.updateMany({
    data: {
      heroImageObjectKey: image.heroImageObjectKey,
      heroImageUrl: image.heroImageUrl,
      imageAlt,
      imagePrompt,
      imageReview: review,
    },
    where: {
      manhwaTitle: topic.manhwaTitle,
      manhwaType: topic.manhwaType,
    },
  });

  prepared.push({
    heroImageUrl: image.heroImageUrl,
    reviewScore: review.score,
    title: topic.manhwaTitle,
  });
}

console.log(
  JSON.stringify(
    {
      force,
      prepared,
      totalPrepared: prepared.length,
    },
    null,
    2
  )
);

await db.$disconnect();
