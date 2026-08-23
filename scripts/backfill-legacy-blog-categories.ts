import {
  type BlogArticleCategory,
  zLegacyBlogArticleBody,
} from '@/features/blog/schema';
import { resolveLegacyBlogArticleCategory } from '@/server/blog/legacy-category-policy';
import { db } from '@/server/db';
import { BlogArticleStatus } from '@/server/db/generated/client';

const execute = process.argv.includes('--execute');

const run = async () => {
  const rows = await db.blogArticle.findMany({
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      body: true,
      excerpt: true,
      generationSource: true,
      keywords: true,
      manhwaTitle: true,
      searchIntent: true,
      slug: true,
      title: true,
    },
    where: {
      status: BlogArticleStatus.published,
    },
  });

  const proposals = rows.flatMap((row) => {
    const legacyBody = zLegacyBlogArticleBody.safeParse(row.body);

    if (!legacyBody.success || legacyBody.data.category) {
      return [];
    }

    return [
      {
        category: resolveLegacyBlogArticleCategory(row),
        slug: row.slug,
        title: row.title,
      },
    ];
  });

  console.info(
    JSON.stringify(
      {
        counts: countByCategory(proposals),
        execute,
        proposals,
        publishedRows: rows.length,
      },
      null,
      2
    )
  );

  if (!execute || proposals.length === 0) {
    return;
  }

  const updatedCounts = await db.$transaction(
    proposals.map((proposal) => {
      return db.$executeRaw`
        UPDATE "blog_articles"
        SET
          "body" = jsonb_set(
            "body",
            '{category}',
            to_jsonb(${proposal.category}::text),
            true
          ),
          "updatedAt" = NOW()
        WHERE "slug" = ${proposal.slug}
          AND "body"->>'category' IS NULL
      `;
    })
  );

  const updatedRows = updatedCounts.reduce((total, count) => total + count, 0);

  console.info(`Updated ${updatedRows} legacy blog articles.`);
};

function countByCategory(
  proposals: readonly { category: BlogArticleCategory }[]
) {
  return proposals.reduce<Record<BlogArticleCategory, number>>(
    (counts, proposal) => ({
      ...counts,
      [proposal.category]: counts[proposal.category] + 1,
    }),
    { app_updates: 0, manhwa_news: 0, recommendations: 0 }
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
