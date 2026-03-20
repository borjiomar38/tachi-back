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
        title="Support and policy placeholders before launch"
        description="Phase 5 adds the support-facing public routes now so checkout, activation, and backoffice flows have somewhere stable to point later."
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
                This route should eventually cover device recovery, manual token
                adjustments, billing questions, and privacy/legal requests.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                <ShieldCheckIcon className="size-5" />
              </div>
              <CardTitle className="text-xl">Launch checklist reminder</CardTitle>
              <CardDescription>
                The support page exists now so later flows do not need to invent
                contact and policy messaging at the last minute.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/70 px-3 py-3">
                Add the real support mailbox and SLA.
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-3">
                Link Stripe receipts and redeem emails back here once those
                phases exist.
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-3">
                Keep device recovery, refund handling, and privacy requests
                clearly separated in the backoffice later.
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
