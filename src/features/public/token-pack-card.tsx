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

import {
  formatCurrency,
  formatTokenCount,
  type PublicTokenPack,
} from '@/features/public/data';

export const TokenPackCard = (props: {
  tokenPack: PublicTokenPack;
  featured?: boolean;
}) => {
  const { tokenPack, featured = false } = props;
  const textMutedClassName = featured
    ? 'text-neutral-300'
    : 'text-muted-foreground';

  return (
    <Card
      className={cn(
        'h-full rounded-[1.5rem] border-border/80 bg-background/90 shadow-sm backdrop-blur',
        featured &&
          'border-neutral-900 bg-neutral-950 text-neutral-50 dark:border-neutral-700'
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-xl">{tokenPack.name}</CardTitle>
            <CardDescription className={textMutedClassName}>
              {tokenPack.marketingSummary}
            </CardDescription>
          </div>
          {featured ? (
            <Badge variant="warning" size="sm">
              Most popular
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm">
              Monthly plan
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-5">
        <div className="space-y-1">
          <p className="text-3xl font-semibold tracking-tight">
            {formatCurrency(tokenPack.priceAmountCents, tokenPack.currency)}
          </p>
          <p className={cn('text-sm', textMutedClassName)}>
            About{' '}
            {formatTokenCount(tokenPack.marketedChaptersPerMonth)} chapters /
            month
          </p>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2">
            <span className={textMutedClassName}>Best for</span>
            <span className="font-medium">{tokenPack.marketingSummary}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2">
            <span className={textMutedClassName}>Detection</span>
            <span className="font-medium">Powerful text scan</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2">
            <span className={textMutedClassName}>Billing</span>
            <span className="font-medium">Monthly renewal</span>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <a
            href={tokenPack.checkoutEnabled ? `/checkout/${tokenPack.key}` : '/support'}
            className={cn(
              buttonVariants({
                variant: featured ? 'secondary' : 'default',
              }),
              'w-full'
            )}
          >
            {tokenPack.checkoutEnabled
              ? 'Buy now'
              : 'Contact support'}
          </a>
          <a
            href="/how-it-works"
            className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}
          >
            How it works
          </a>
        </div>

        <p className={cn('text-xs leading-5', textMutedClassName)}>
          Simple monthly access for manga and manhwa translation inside the
          app.
        </p>

        <p className={cn('text-xs leading-5', textMutedClassName)}>
          {tokenPack.checkoutEnabled
            ? 'After payment, your activation code is sent by email.'
            : 'Online payment is not configured in this environment yet.'}
        </p>
      </CardContent>
    </Card>
  );
};
