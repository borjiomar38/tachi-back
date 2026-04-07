import { ArrowRightIcon, MailIcon, ShieldCheckIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import {
  PUBLIC_SUPPORT_EMAIL,
  supportFaqs,
} from '@/features/public/data';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

export const PageSupport = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Support"
        title="Support and policy routes"
        description="Use this page for billing questions, redeem-code help, device recovery guidance, and policy links."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="rounded-[1.5rem] border-neutral-900 bg-neutral-950 text-neutral-50">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-neutral-50">
                <MailIcon className="size-5" />
              </div>
              <CardTitle className="text-xl">Contact path</CardTitle>
              <CardDescription className="text-neutral-300">
                Replace this local placeholder with a production support mailbox
                before launch.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
                className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full')}
              >
                {PUBLIC_SUPPORT_EMAIL}
              </a>
              <p className="text-sm leading-6 text-neutral-300">
                Use this route for device recovery, manual token adjustments,
                billing questions, and privacy or legal requests.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                <ShieldCheckIcon className="size-5" />
              </div>
              <CardTitle className="text-xl">Support flow notes</CardTitle>
              <CardDescription>
                Keep receipt, redeem-code, and device-recovery guidance
                consistent here so customers know what to do next.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/70 px-3 py-3">
                Add the real support mailbox and SLA.
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-3">
                Use Lemon Squeezy receipts and redeem-code emails to reconcile
                orders quickly.
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-3">
                Keep device recovery, refund handling, and privacy requests
                clearly separated in the backoffice.
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="FAQ"
        title="Customer-facing questions"
        description="These answers stay consistent with the current Android app reality while still explaining the hosted direction."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {supportFaqs.map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/legal/privacy"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Privacy placeholder
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/legal/terms"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Terms placeholder
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};
