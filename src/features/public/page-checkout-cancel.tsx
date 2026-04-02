import { ArrowLeftIcon, CircleSlash2Icon } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { PublicSection, PublicShell } from '@/features/public/public-shell';

export const PageCheckoutCancel = (props: {
  search: {
    tokenPack?: string;
  };
}) => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Checkout"
        title="Checkout was cancelled"
        description="No subscription was activated here. You can return to pricing and start a new checkout whenever you are ready."
        className="pb-20 pt-10"
      >
        <Card className="max-w-3xl rounded-[1.5rem]">
          <CardHeader className="gap-3">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <CircleSlash2Icon className="size-6" />
                Subscription not completed
              </CardTitle>
              <CardDescription>
                Lemon Squeezy returned a cancellation flow for{' '}
                <strong>{props.search.tokenPack ?? 'the selected plan'}</strong>.
              </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              This phase only handles subscription checkout initiation, so
              cancellation just returns you to the public site. There is no
              token ledger change or activation code to unwind here yet.
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/pricing"
                className={buttonVariants({ variant: 'default', size: 'lg' })}
              >
                <span className="flex items-center gap-2">
                  <ArrowLeftIcon className="size-4" />
                  Back to pricing
                </span>
              </a>
              <a
                href="/support"
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                Contact support
              </a>
            </div>
          </CardContent>
        </Card>
      </PublicSection>
    </PublicShell>
  );
};
