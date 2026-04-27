import {
  ArrowRightIcon,
  CheckCircle2Icon,
  Clock3Icon,
  KeyRoundIcon,
  LifeBuoyIcon,
  MailCheckIcon,
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

export const PageCheckoutSuccess = (props: {
  search: {
    tokenPack?: string;
  };
}) => {
  const selectedPlan = props.search.tokenPack ?? 'your selected plan';

  return (
    <PublicShell>
      <PublicSection
        eyebrow="Checkout"
        title="Checkout completed"
        description="Lemon Squeezy accepted the checkout handoff. Tokens and activation finish after the payment webhook is confirmed."
        className="pb-20 pt-10"
      >
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="public-ink-panel rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-positive-400/15 text-positive-200 ring-1 ring-positive-300/30">
                <CheckCircle2Icon className="size-6" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl text-neutral-50">
                  Subscription checkout received
                </CardTitle>
                <CardDescription className="text-base leading-7 text-neutral-300">
                  Plan <strong className="text-neutral-50">{selectedPlan}</strong>{' '}
                  is now waiting for Lemon Squeezy webhook confirmation.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                {
                  icon: Clock3Icon,
                  title: 'Payment confirmation',
                  description:
                    'The backend waits for the first paid invoice webhook before crediting monthly tokens.',
                },
                {
                  icon: KeyRoundIcon,
                  title: 'Redeem code delivery',
                  description:
                    'The activation code is sent only after the webhook has been processed.',
                },
                {
                  icon: MailCheckIcon,
                  title: 'Receipt as fallback',
                  description:
                    'Keep the Lemon Squeezy receipt email in case support needs to reconcile the purchase.',
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:grid-cols-[auto_1fr]"
                  >
                    <div className="flex size-9 items-center justify-center rounded-full bg-white/8 text-brand-100 ring-1 ring-white/10">
                      <Icon className="size-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-neutral-50">
                        {item.title}
                      </p>
                      <p className="text-sm leading-6 text-neutral-300">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="public-brand-panel-muted rounded-[1.5rem]">
            <CardHeader className="gap-2">
              <CardTitle>What to keep for support</CardTitle>
              <CardDescription>
                If webhook processing or redeem-code delivery is delayed, keep
                your Lemon Squeezy receipt email and the selected plan name.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
                <p className="text-sm font-medium">Selected plan</p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {selectedPlan}
                </p>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Keep the payer email used at checkout and the Lemon Squeezy
                receipt email so support can reconcile the purchase quickly.
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="/support"
                  className={buttonVariants({ variant: 'default', size: 'lg' })}
                >
                  <span className="flex items-center gap-2">
                    Support
                    <LifeBuoyIcon className="size-4" />
                  </span>
                </a>
                <a
                  href="/how-it-works"
                  className={buttonVariants({ variant: 'secondary', size: 'lg' })}
                >
                  <span className="flex items-center gap-2">
                    Activation plan
                    <ArrowRightIcon className="size-4" />
                  </span>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicSection>
    </PublicShell>
  );
};
