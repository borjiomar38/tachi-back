import {
  ArrowLeftIcon,
  CreditCardIcon,
  KeyRoundIcon,
  MailIcon,
  ShieldCheckIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import {
  formatCurrency,
  formatTokenCount,
  type PublicTokenPack,
} from '@/features/public/data';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

const checkoutErrorMessages: Record<string, string> = {
  checkout_unavailable:
    'Stripe did not return a hosted checkout URL. Please try again.',
  invalid_request:
    'Enter a valid payer email before continuing to Stripe.',
  stripe_disabled: 'Stripe checkout is disabled in this environment.',
  token_pack_not_found: 'The selected token pack is not available anymore.',
  token_pack_unavailable:
    'This token pack is visible publicly, but its Stripe price is not configured yet.',
};

export const PageCheckout = (props: {
  search: {
    email?: string;
    error?: string;
  };
  tokenPack: PublicTokenPack | null;
  tokenPackKey: string;
}) => {
  const errorMessage = props.search.error
    ? checkoutErrorMessages[props.search.error] ??
      'The checkout request could not be prepared. Please try again.'
    : null;

  if (!props.tokenPack) {
    return (
      <PublicShell>
        <PublicSection
          eyebrow="Checkout"
          title="Token pack not found"
          description="This pack is not active on the public pricing surface anymore."
          className="pb-20 pt-10"
        >
          <Card className="max-w-2xl rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <CardTitle>Unavailable selection</CardTitle>
              <CardDescription>
                The token pack key <code>{props.tokenPackKey}</code> does not
                match an active public pack.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <a
                href="/pricing"
                className={buttonVariants({ variant: 'default', size: 'lg' })}
              >
                Back to pricing
              </a>
              <a
                href="/support"
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                Contact support
              </a>
            </CardContent>
          </Card>
        </PublicSection>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <PublicSection
        eyebrow="Checkout"
        title={`Buy ${props.tokenPack.name}`}
        description="Stripe handles payment. Token crediting, redeem-code creation, and device activation still happen in later phases after webhook confirmation."
        className="pb-20 pt-10"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <Card className="rounded-[1.5rem] border-neutral-900 bg-neutral-950 text-neutral-50">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">
                    {props.tokenPack.name}
                  </CardTitle>
                  <CardDescription className="text-neutral-300">
                    {props.tokenPack.description ??
                      'Hosted OCR and translation tokens.'}
                  </CardDescription>
                </div>
                <Badge variant="warning" size="sm">
                  Stripe
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-2xl border border-white/10 px-4 py-4">
                <p className="text-sm text-neutral-300">One-time payment</p>
                <p className="mt-1 text-3xl font-semibold">
                  {formatCurrency(
                    props.tokenPack.priceAmountCents,
                    props.tokenPack.currency
                  )}
                </p>
                <p className="mt-2 text-sm text-neutral-300">
                  {formatTokenCount(props.tokenPack.totalTokens)} total tokens
                </p>
              </div>

              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
                  <span className="text-neutral-300">Base tokens</span>
                  <span>{formatTokenCount(props.tokenPack.tokenAmount)}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
                  <span className="text-neutral-300">Bonus tokens</span>
                  <span>
                    {formatTokenCount(props.tokenPack.bonusTokenAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
                  <span className="text-neutral-300">Activation</span>
                  <span>Redeem code later</span>
                </div>
              </div>

              <Alert className="border-white/10 bg-white/5 text-neutral-50">
                <CreditCardIcon />
                <AlertTitle>What this page does</AlertTitle>
                <AlertDescription className="text-neutral-300">
                  This step only creates a Stripe Checkout Session. It does not
                  credit tokens immediately, and it does not activate a device
                  yet.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {errorMessage ? (
              <Alert variant="destructive">
                <ShieldCheckIcon />
                <AlertTitle>Checkout could not start</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            ) : null}

            {!props.tokenPack.checkoutEnabled ? (
              <Alert>
                <KeyRoundIcon />
                <AlertTitle>Checkout not configured</AlertTitle>
                <AlertDescription>
                  This environment does not have a Stripe price mapped for{' '}
                  {props.tokenPack.name} yet. Keep the pack visible publicly,
                  but route customers to support until the mapping is in place.
                </AlertDescription>
              </Alert>
            ) : null}

            <Card className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle>Continue with Stripe</CardTitle>
                <CardDescription>
                  Use the payer email you want receipts and later redeem-code
                  instructions tied to.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <form
                  method="POST"
                  action="/api/stripe/checkout"
                  className="grid gap-4"
                >
                  <input
                    type="hidden"
                    name="tokenPackKey"
                    value={props.tokenPack.key}
                  />

                  <div className="grid gap-2">
                    <label
                      htmlFor="payerEmail"
                      className="text-sm font-medium"
                    >
                      Payer email
                    </label>
                    <Input
                      id="payerEmail"
                      name="payerEmail"
                      type="email"
                      size="lg"
                      required
                      autoComplete="email"
                      defaultValue={props.search.email ?? ''}
                      startAddon={<MailIcon className="size-4" />}
                    />
                    <p className="text-sm text-muted-foreground">
                      Stripe payment starts here. Support and activation still
                      use redeem-code flows in later phases.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={!props.tokenPack.checkoutEnabled}
                  >
                    Continue to Stripe
                  </Button>
                </form>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="/pricing"
                    className={cn(
                      buttonVariants({ variant: 'ghost', size: 'default' })
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowLeftIcon className="size-4" />
                      Back to pricing
                    </span>
                  </a>
                  <a
                    href="/how-it-works"
                    className={buttonVariants({ variant: 'secondary' })}
                  >
                    How activation works
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicSection>
    </PublicShell>
  );
};
