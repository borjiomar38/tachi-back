import {
  ArrowLeftIcon,
  CreditCardIcon,
  KeyRoundIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { cn } from "@/lib/tailwind/utils";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { formatCurrency, type PublicTokenPack } from "@/features/public/data";
import { PublicSection, PublicShell } from "@/features/public/public-shell";

const checkoutErrorMessages: Record<string, string> = {
  checkout_unavailable:
    "Lemon Squeezy did not return a checkout URL. Please try again.",
  checkout_test_mode:
    "Live checkout is not available yet because the Lemon Squeezy product is still in test mode.",
  invalid_request: "Enter a valid email address before continuing to checkout.",
  ls_disabled: "Checkout is disabled in this environment.",
  token_pack_not_found: "The selected monthly plan is not available anymore.",
  token_pack_unavailable:
    "This monthly plan is visible publicly, but its Lemon Squeezy variant is not configured yet.",
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
    ? (checkoutErrorMessages[props.search.error] ??
      "The checkout request could not be prepared. Please try again.")
    : null;

  if (!props.tokenPack) {
    return (
      <PublicShell>
        <PublicSection
          eyebrow="Checkout"
          title="Monthly plan not found"
          description="This plan is not active on the public pricing surface anymore."
          className="pb-20 pt-10"
        >
          <Card className="max-w-2xl rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <CardTitle>Unavailable selection</CardTitle>
              <CardDescription>
                The plan key <code>{props.tokenPackKey}</code> does not match an
                active public monthly plan.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <a
                href="/pricing"
                className={buttonVariants({ variant: "default", size: "lg" })}
              >
                Back to pricing
              </a>
              <a
                href="/support"
                className={buttonVariants({ variant: "secondary", size: "lg" })}
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
        title={`Subscribe to ${props.tokenPack.name}`}
        titleAs="h1"
        description="Your monthly chapter allowance and activation code are issued after payment is confirmed."
        className="pb-20 pt-10"
      >
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <Card className="public-brand-panel rounded-[1.5rem] text-neutral-50">
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-2xl">
                    {props.tokenPack.name}
                  </CardTitle>
                  <CardDescription className="text-neutral-300">
                    Full-chapter AI translation in Nayovi.
                  </CardDescription>
                </div>
                <Badge variant="brand" size="sm">
                  Lemon Squeezy
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-2xl border border-white/10 px-4 py-4">
                <p className="text-sm text-neutral-300">Monthly subscription</p>
                <p className="mt-1 text-3xl font-semibold">
                  {formatCurrency(
                    props.tokenPack.priceAmountCents,
                    props.tokenPack.currency,
                  )}
                </p>
                <p className="mt-2 text-sm text-neutral-300">
                  About {props.tokenPack.marketedChaptersPerMonth} chapters per
                  month
                </p>
              </div>

              <div className="grid gap-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
                  <span className="text-neutral-300">Included chapters</span>
                  <span>
                    About {props.tokenPack.marketedChaptersPerMonth} per month
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
                  <span className="text-neutral-300">Billing</span>
                  <span>Renews monthly · allowance resets</span>
                </div>
              </div>

              <Alert className="border-white/10 bg-white/5 text-neutral-50">
                <CreditCardIcon />
                <AlertTitle>Secure checkout</AlertTitle>
                <AlertDescription className="text-neutral-300">
                  This step creates the checkout session. Your plan becomes
                  active after payment confirmation.
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
                  {props.tokenPack.name} cannot be purchased right now. Contact
                  support and we will help you.
                </AlertDescription>
              </Alert>
            ) : null}

            <Card className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle>Continue to checkout</CardTitle>
                <CardDescription>
                  Use the email where you want to receive receipts and
                  activation instructions.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <form
                  method="POST"
                  action="/api/payments/checkout"
                  className="grid gap-4"
                >
                  <input
                    type="hidden"
                    name="tokenPackKey"
                    value={props.tokenPack.key}
                  />

                  <div className="grid gap-2">
                    <label htmlFor="payerEmail" className="text-sm font-medium">
                      Email address
                    </label>
                    <Input
                      id="payerEmail"
                      name="payerEmail"
                      type="email"
                      size="lg"
                      required
                      autoComplete="email"
                      defaultValue={props.search.email ?? ""}
                      startAddon={<MailIcon className="size-4" />}
                    />
                    <p className="text-sm text-muted-foreground">
                      After payment, we email the code used to activate Nayovi.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={!props.tokenPack.checkoutEnabled}
                  >
                    Continue to checkout
                  </Button>
                </form>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="/pricing"
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "default" }),
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowLeftIcon className="size-4" />
                      Back to pricing
                    </span>
                  </a>
                  <a
                    href="/how-it-works"
                    className={buttonVariants({ variant: "secondary" })}
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
