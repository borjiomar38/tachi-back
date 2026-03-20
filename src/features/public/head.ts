import { getPageTitle } from '@/lib/get-page-title';

export const buildPublicPageHead = (pageTitle: string, description: string) => ({
  meta: [
    {
      title: getPageTitle(pageTitle),
    },
    {
      name: 'description',
      content: description,
    },
  ],
});
