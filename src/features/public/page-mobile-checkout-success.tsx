import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  RefreshCwIcon,
  SmartphoneIcon,
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { PublicSection, PublicShell } from '@/features/public/public-shell';

export const PageMobileCheckoutSuccess = (props: { intent: string }) => {
  const appReturnUrl = `nayovi://subscription/checkout?intent=${encodeURIComponent(props.intent)}`;

  return (
    <PublicShell>
      <PublicSection
        eyebrow="Nayovi app"
        title="Return to Nayovi to continue"
        titleAs="h1"
        description="Your payment is being confirmed automatically. Nayovi will activate this phone and resume what you were translating."
        className="pb-20 pt-10"
      >
        <Card className="mx-auto max-w-3xl rounded-[1.5rem]">
          <CardHeader className="gap-3 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-positive-400/15 text-positive-200 ring-1 ring-positive-300/30">
              <CheckCircle2Icon className="size-7" />
            </div>
            <CardTitle className="text-2xl">Checkout received</CardTitle>
            <CardDescription className="text-base leading-7">
              No activation code is required in the normal flow. Return to the
              same phone that opened this checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                <SmartphoneIcon className="mb-3 size-5" />
                <p className="font-semibold">Automatic activation</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The plan is linked to the Nayovi installation that started
                  payment.
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                <RefreshCwIcon className="mb-3 size-5" />
                <p className="font-semibold">Automatic resume</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The app refreshes the subscription and resumes the interrupted
                  translation.
                </p>
              </div>
            </div>

            <a
              href={appReturnUrl}
              className={buttonVariants({ size: 'lg', variant: 'default' })}
            >
              <span className="flex items-center gap-2">
                <SmartphoneIcon className="size-5" />
                Return to Nayovi
              </span>
            </a>

            <div className="rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 font-medium text-foreground">
                <KeyRoundIcon className="size-4" />
                Fallback
              </span>{' '}
              If the automatic return fails, the activation code in your email
              still works.
            </div>

            <a
              href="/pricing"
              className={buttonVariants({ size: 'lg', variant: 'secondary' })}
            >
              <span className="flex items-center gap-2">
                <ArrowLeftIcon className="size-4" />
                Back to plans
              </span>
            </a>
          </CardContent>
        </Card>
      </PublicSection>
    </PublicShell>
  );
};
