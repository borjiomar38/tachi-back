import { createInstance } from 'i18next';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';

import {
  fallbackPublicTokenPacks,
  type PublicTokenPack,
} from '@/features/public/data';
import { PageLanding } from '@/features/public/page-landing';
import { PagePricing } from '@/features/public/page-pricing';
import { resolveTokenPackAction } from '@/features/public/token-pack-action';
import { TokenPackCard } from '@/features/public/token-pack-card';
import tokens from '@/locales/en/tokens.json';

vi.mock('@/features/public/public-shell', () => ({
  PublicShell: ({ children }: { children: ReactNode }) => children,
  PublicSection: ({
    children,
    title,
    description,
    id,
    className,
  }: {
    children: ReactNode;
    title: string;
    description: string;
    id: string;
    className: string;
  }) =>
    createElement('section', { id, className }, title, description, children),
}));
vi.mock('@/lib/orpc/client', () => ({
  orpc: {
    tokenPurchase: {
      consumption: { queryOptions: () => ({ queryKey: ['test-costs'] }) },
    },
  },
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: {
      chapterModes: [{ key: 'standard', tokenCost: 17 }],
      advancedSearch: { tokenCost: 6 },
    },
    isError: false,
  }),
}));

const i18n = createInstance();
await i18n.init({
  lng: 'en',
  resources: { en: { tokens } },
  interpolation: { escapeValue: false },
});
const render = (children: ReactNode) =>
  renderToStaticMarkup(createElement(I18nextProvider, { i18n }, children));
const packs: PublicTokenPack[] = fallbackPublicTokenPacks.map((pack) => ({
  ...pack,
  checkoutEnabled: pack.key !== 'free',
}));

describe('restored token offer presentation', () => {
  it.each(['starter-tokens', 'pro-tokens', 'power-tokens'])(
    'keeps the new checkout route for %s',
    (key) => {
      const pack = packs.find((item) => item.key === key)!;
      expect(resolveTokenPackAction(pack)).toEqual({
        href: `/checkout/${key}`,
        labelKey: 'tokens:choose',
      });
      expect(
        render(createElement(TokenPackCard, { tokenPack: pack, compact: true }))
      ).toContain(`href="/checkout/${key}"`);
    }
  );

  it('keeps the trial and unavailable packs out of checkout', () => {
    expect(resolveTokenPackAction(packs[0]!).href).toBe('/download');
    const unavailable = { ...packs[1]!, checkoutEnabled: false };
    expect(resolveTokenPackAction(unavailable).href).toBe('/support');
    const html = render(
      createElement(TokenPackCard, { tokenPack: unavailable })
    );
    expect(html).toContain('Contact support');
    expect(html).not.toContain('/checkout/');
  });

  it('renders changed catalog amounts without hardcoded quotas or recurring wording', () => {
    const html = render(
      createElement(TokenPackCard, {
        tokenPack: { ...packs[2]!, totalTokens: 4321, priceAmountCents: 1234 },
        featured: true,
        compact: true,
      })
    );
    expect(html).toContain('4,321 tokens');
    expect(html).toContain('$12.34');
    expect(html).toContain('one-time payment');
    expect(html).toContain('public-brand-panel');
    expect(html).not.toMatch(
      /chapters \/ month|Monthly plan|Renews monthly|nayovi-token\.png/
    );
  });

  it.each([PageLanding, PagePricing])(
    'shows the trial and three dynamic packs in the original responsive grid',
    (Page) => {
      const html = render(createElement(Page, { tokenPacks: packs }));
      for (const count of ['25', '250', '1,250', '2,750'])
        expect(html).toContain(`${count} tokens`);
      for (const key of ['starter-tokens', 'pro-tokens', 'power-tokens'])
        expect(html).toContain(`/checkout/${key}`);
      expect(html).toContain('sm:grid-cols-2 xl:grid-cols-4');
      expect(html).toContain('id="starter-plan"');
      expect(html).toContain('id="faq"');
      expect(html).not.toMatch(/chapters \/ month|Monthly plan|Renews monthly/);
    }
  );

  it('keeps consumption costs dynamic in the restored information block', () => {
    const html = render(createElement(PagePricing, { tokenPacks: packs }));
    expect(html).toContain(
      '1 chapter: 17 tokens. Advanced search: 6 tokens. Reading remains free.'
    );
  });
});
