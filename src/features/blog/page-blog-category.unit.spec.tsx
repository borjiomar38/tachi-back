import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { getBlogCategoryConfig } from '@/features/blog/category';
import { PageBlogCategory } from '@/features/blog/page-blog-category';

vi.mock('@/features/public/public-shell', () => ({
  PublicSection: ({
    children,
    description,
    eyebrow,
    title,
  }: {
    children: ReactNode;
    description: string;
    eyebrow: string;
    title: string;
  }) => (
    <section>
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  ),
  PublicShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const pagination = {
  hasNextPage: false,
  hasPreviousPage: false,
  page: 1,
  pageEnd: 0,
  pageSize: 14,
  pageStart: 0,
  totalItems: 0,
  totalPages: 1,
};

describe('PageBlogCategory', () => {
  it('renders unique category copy and links to every category archive', () => {
    const html = renderToStaticMarkup(
      <PageBlogCategory
        articles={[]}
        category={getBlogCategoryConfig('recommendations')}
        pagination={pagination}
      />
    );

    expect(html).toContain('Manhwa recommendations');
    expect(html).toContain('/blog/category/recommendations');
    expect(html).toContain('/blog/category/manhwa-news');
    expect(html).toContain('/blog/category/app-updates');
    expect(html).toContain('aria-current="page"');
  });
});
