import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import '@/styles/app.css';

import i18n from '@/lib/i18n';
import { orpc } from '@/lib/orpc/client';
import type { Inputs, Outputs } from '@/lib/orpc/types';

import { ReleaseHistory } from '@/features/version-history/manager/release-history';
import { useReleaseHistoryStore } from '@/features/version-history/manager/release-history-store';

vi.mock('@/env/client', () => ({
  envClient: { VITE_BASE_URL: 'http://localhost' },
}));

const { loadPage } = vi.hoisted(() => ({
  loadPage:
    vi.fn<
      (
        input: Inputs['mobileRelease']['list']
      ) => Promise<Outputs['mobileRelease']['list']>
    >(),
}));
vi.mock('@/lib/orpc/client', async () => {
  const { createORPCReactQueryUtils } = await import('@orpc/react-query');
  return {
    orpc: createORPCReactQueryUtils({ mobileRelease: { list: loadPage } }),
  };
});

type Release = Outputs['mobileRelease']['list']['items'][number];
const release: Release = {
  id: 'release-54',
  platform: 'android',
  channel: 'standard-release',
  versionCode: 54,
  versionName: '0.17.44',
  createdAt: new Date(),
  publishedAt: null,
  releaseInfo: {
    schemaVersion: 1,
    versionCode: 54,
    versionName: '0.17.44',
    defaultLocale: 'en',
    locales: {
      en: {
        title: 'Smoother reading',
        summary:
          'A lighter library, progressive updates and more responsive actions.',
        highlights: [],
      },
      fr: {
        title: 'Une lecture plus fluide',
        summary:
          'Une bibliothèque plus légère, des mises à jour progressives et des actions plus réactives.',
        highlights: [
          {
            icon: 'library',
            title: 'Library et Updates plus fluides',
            body: 'Les chapitres apparaissent progressivement, sans attendre toutes les métadonnées.',
          },
          {
            icon: 'download',
            title: 'Téléchargements réactifs',
            body: 'La demande est prise en compte tout de suite et reste annulable.',
          },
          {
            icon: 'reader',
            title: 'Lecture des chapitres traduits',
            body: 'Correction du blocage observé lors de la lecture du chapitre traduit.',
          },
        ],
      },
      ar: {
        title: 'قراءة أكثر سلاسة',
        summary: 'مكتبة أخف وتحديثات تظهر تدريجياً وإجراءات أسرع استجابة.',
        highlights: [],
      },
    },
  },
};

afterEach(() => {
  vi.restoreAllMocks();
  useReleaseHistoryStore.setState({ locales: {} });
});

const show = async (items: Release[], nextCursor: number | null = null) => {
  await i18n.changeLanguage('fr');
  document.documentElement.classList.add('dark');
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  const options = orpc.mobileRelease.list.infiniteOptions({
    input: (beforeVersionCode: number | undefined) => ({
      beforeVersionCode,
      limit: 10,
    }),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  client.setQueryData(options.queryKey, {
    pages: [{ items, nextCursor }],
    pageParams: [undefined],
  });
  await render(
    <QueryClientProvider client={client}>
      <main className="min-h-screen bg-background p-6 text-foreground">
        <ReleaseHistory />
      </main>
    </QueryClientProvider>
  );
};

it('renders the archived release and switches FR EN AR without losing the original notes', async () => {
  await page.viewport(1100, 800);
  await show([release]);
  await expect.element(page.getByText('Une lecture plus fluide')).toBeVisible();
  await expect.element(page.getByText('Publication en attente')).toBeVisible();
  await page.screenshot({
    path: '../../../../docs/ux/release-history-20260914/implementation-desktop.png',
  });
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await expect.element(page.getByText('Smoother reading')).toBeVisible();
  await page.getByRole('button', { name: 'AR', exact: true }).click();
  await expect.element(page.getByText('قراءة أكثر سلاسة')).toBeVisible();
  await page.getByRole('button', { name: 'FR', exact: true }).click();
  await expect
    .element(page.getByText('Téléchargements réactifs'))
    .toBeVisible();
  await page.viewport(390, 844);
  await page.screenshot({
    path: '../../../../docs/ux/release-history-20260914/implementation-mobile.png',
  });
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(390);
});

it('shows an explicit empty history without inventing old release notes', async () => {
  await show([]);
  await expect
    .element(
      page.getByText('Aucune note de publication archivée pour le moment.')
    )
    .toBeVisible();
});

it('loads the next page and distinguishes published records', async () => {
  await show([release], 54);
  loadPage.mockResolvedValue({
    items: [
      {
        ...release,
        id: 'release-53',
        versionCode: 53,
        versionName: '0.17.43',
        publishedAt: new Date(),
      },
    ],
    nextCursor: null,
  });
  await page
    .getByRole('button', { name: 'Charger les versions précédentes' })
    .click();
  await expect
    .element(page.getByRole('heading', { name: '0.17.43 · Build 53' }))
    .toBeVisible();
  await expect
    .element(
      page.getByRole('button', { name: 'Charger les versions précédentes' })
    )
    .not.toBeInTheDocument();
  await expect
    .element(page.getByText('Publiée', { exact: true }))
    .toBeVisible();
  expect(loadPage).toHaveBeenCalledWith(
    { beforeVersionCode: 54, limit: 10 },
    expect.anything()
  );
});

it('reports refresh failures while keeping archived content visible', async () => {
  await show([release]);
  loadPage.mockRejectedValueOnce(new Error('Unavailable'));
  await page.getByRole('button', { name: 'Actualiser' }).click();
  await expect.element(page.getByRole('alert')).toBeVisible();
  await expect.element(page.getByText('Une lecture plus fluide')).toBeVisible();
});
