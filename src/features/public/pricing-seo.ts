import i18n from '@/lib/i18n';

interface PricingSeoCopy {
  description: string;
  pageTitle: string;
}

interface ResolvePricingSeoCopyOptions extends PricingSeoCopy {
  language?: string;
  path: string;
}

type PricingSeoCopyResolver = (language: string) => PricingSeoCopy;

const pricingSeoCopyResolvers: Partial<
  Record<string, PricingSeoCopyResolver>
> = {
  '/pricing': (language) => ({
    description: i18n.t('public:pricingSeo.description', { lng: language }),
    pageTitle: i18n.t('public:pricingSeo.title', { lng: language }),
  }),
};

export const resolvePricingSeoCopy = (
  options: ResolvePricingSeoCopyOptions
): PricingSeoCopy => {
  const resolver = pricingSeoCopyResolvers[options.path];

  return resolver?.(options.language ?? i18n.resolvedLanguage ?? 'en') ?? {
    description: options.description,
    pageTitle: options.pageTitle,
  };
};
