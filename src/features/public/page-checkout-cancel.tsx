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
        titleAs="h1"
        description="Checkout was closed. If you paid, check your email or return to Nayovi before starting another purchase."
        className="pt-10 pb-20"
      >
        <Card className="max-w-3xl rounded-[1.5rem]">
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <CircleSlash2Icon className="size-6" />
              Checkout closed
            </CardTitle>
            <CardDescription>
              Lemon Squeezy returned a cancellation flow for{' '}
              <strong>{props.search.tokenPack ?? 'the selected plan'}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Closing this page does not cancel a completed payment. Check your
              email for an activation code if you paid.
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
