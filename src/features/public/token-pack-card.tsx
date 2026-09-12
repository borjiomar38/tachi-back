import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/tailwind/utils';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { formatCurrency, type PublicTokenPack } from '@/features/public/data';
import { resolveTokenPackAction } from '@/features/public/token-pack-action';

export const tokenGoldButton =
  'inline-flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#ffed93] bg-linear-to-b from-[#ffe778] to-[#ffc44c] px-5 py-3 font-semibold text-[#211506] shadow-[0_3px_18px_#f8c84b20] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffe173] disabled:cursor-not-allowed disabled:opacity-45';

interface TokenPackCardProps {
  compact?: boolean;
  tokenPack: PublicTokenPack;
  featured?: boolean;
  id?: string;
  showCoffeePrice?: boolean;
}

export const TokenPackCard = (props: TokenPackCardProps) => {
  const {
    compact = false,
    tokenPack,
    featured = false,
    showCoffeePrice = false,
  } = props;
  const { t } = useTranslation(['tokens']);
  const action = resolveTokenPackAction(tokenPack);
  const isFreePlan = tokenPack.key === 'free';
  const textMutedClassName = featured
    ? 'text-neutral-300'
    : 'text-muted-foreground';
  const formattedPrice = formatCurrency(
    tokenPack.priceAmountCents,
    tokenPack.currency
  );
  const displayedPrice = showCoffeePrice
    ? formattedPrice.replace(/\.00$/, '')
    : formattedPrice;

  return (
    <Card
      id={props.id}
      className={cn(
        'h-full scroll-mt-28 rounded-[1.5rem] border-border/80 bg-background/90 shadow-sm backdrop-blur',
        featured &&
          'public-brand-panel text-neutral-50 ring-1 ring-brand-400/30'
      )}
    >
      <CardHeader className={cn('gap-3', compact && 'p-4 pb-2')}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className={compact ? 'text-lg' : 'text-xl'}>
              {tokenPack.name}
            </CardTitle>
            <CardDescription className={textMutedClassName}>
              {tokenPack.marketingSummary || t('tokens:packFallback')}
            </CardDescription>
          </div>
          {isFreePlan ? (
            <Badge variant="secondary" size="sm">
              {t('tokens:freeTrialBadge')}
            </Badge>
          ) : featured ? (
            <Badge variant="brand" size="sm">
              {t('tokens:popular')}
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm">
              {t('tokens:packBadge')}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent
        className={cn(
          'flex h-full flex-col gap-5',
          compact && 'gap-3 p-4 pt-2'
        )}
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
            <p
              className={cn(
                'font-semibold tracking-tight',
                compact ? 'text-2xl' : 'text-3xl'
              )}
            >
              {isFreePlan ? t('tokens:freePrice') : displayedPrice}
            </p>
            {!isFreePlan && showCoffeePrice ? (
              <span className={cn('text-sm font-medium', textMutedClassName)}>
                {t('tokens:once')}
              </span>
            ) : null}
          </div>
          {!isFreePlan && showCoffeePrice ? (
            <p className={cn('text-sm font-medium', textMutedClassName)}>
              {t('tokens:noSubscription')}
            </p>
          ) : null}
          <p className={cn('text-sm', textMutedClassName)}>
            {t('tokens:tokens', { count: tokenPack.totalTokens })}
          </p>
        </div>

        <div className={cn('grid gap-2 text-sm', compact && 'gap-1 text-xs')}>
          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2',
              compact && 'rounded-lg px-2 py-1.5'
            )}
          >
            <span className={textMutedClassName}>{t('tokens:bestFor')}</span>
            <span className="font-medium">
              {tokenPack.marketingSummary || t('tokens:packFallback')}
            </span>
          </div>
          <div
            className={cn(
              'flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2',
              compact && 'rounded-lg px-2 py-1.5'
            )}
          >
            <span className={textMutedClassName}>
              {t(isFreePlan ? 'tokens:access' : 'tokens:billing')}
            </span>
            <span className="font-medium">
              {t(isFreePlan ? 'tokens:oneTimeTrial' : 'tokens:oneTime')}
            </span>
          </div>
        </div>

        <div className={cn('mt-auto flex flex-col gap-2', compact && 'pt-1')}>
          <a
            href={action.href}
            className={cn(
              buttonVariants({
                variant: featured ? 'secondary' : 'default',
              }),
              'w-full'
            )}
          >
            {t(action.labelKey, { name: tokenPack.name.split(' ')[0] })}
          </a>
          {!compact ? (
            <a
              href="/how-it-works"
              className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}
            >
              {t('tokens:howItWorks')}
            </a>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
