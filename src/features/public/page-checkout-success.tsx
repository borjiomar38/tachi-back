import { ArrowRightIcon, CheckCircle2Icon, LifeBuoyIcon } from 'lucide-react';

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
    sessionId?: string;
    tokenPack?: string;
  };
}) => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Checkout"
        title="Checkout completed"
        description="This page only confirms the checkout handoff. Monthly token crediting, activation-code generation, and device activation depend on webhook processing."
        className="pb-20 pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="rounded-[1.5rem] border-positive-300 bg-positive-50/70">
            <CardHeader className="gap-3">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CheckCircle2Icon className="size-6" />
                Subscription step finished
              </CardTitle>
              <CardDescription>
                Lemon Squeezy returned you to Tachiyomi Back after checkout for{' '}
                <strong>{props.search.tokenPack ?? 'your selected plan'}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="rounded-xl border border-positive-300/70 bg-background px-4 py-3">
                Monthly token crediting is intentionally not finalized on this
                page.
              </div>
              <div className="rounded-xl border border-positive-300/70 bg-background px-4 py-3">
                The backend finalizes the first paid invoice through
                webhooks before crediting tokens.
              </div>
              <div className="rounded-xl border border-positive-300/70 bg-background px-4 py-3">
                Activation-code delivery and device binding happen after that
                webhook confirmation.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem]">
            <CardHeader className="gap-2">
              <CardTitle>What to keep for support</CardTitle>
              <CardDescription>
                If you need help reconciling the payment later, keep the
                order reference.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
                <p className="text-sm font-medium">Order reference</p>
                <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                  {props.search.sessionId ?? 'Unavailable'}
                </p>
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
