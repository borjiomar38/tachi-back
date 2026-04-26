import {
  ArrowRightIcon,
  MailIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
} from 'lucide-react';

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
  PUBLIC_OWNER_WHATSAPP_DISPLAY,
  PUBLIC_OWNER_WHATSAPP_HREF,
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
          <Card className="public-brand-panel rounded-[1.5rem] text-neutral-50">
            <CardHeader className="gap-4">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-positive-100 text-positive-700 ring-1 ring-positive-200 dark:bg-positive-500/15 dark:text-positive-200 dark:ring-positive-500/25">
                  <MessageCircleIcon className="size-6" />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="brand" size="sm">
                      WhatsApp
                    </Badge>
                    <Badge variant="positive" size="sm">
                      Fastest reply
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">WhatsApp support</CardTitle>
                  <CardDescription className="text-neutral-300">
                    Fastest for payment, redeem-code, activation, and setup help.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <a
                href={PUBLIC_OWNER_WHATSAPP_HREF}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'w-full')}
              >
                <span className="flex items-center gap-2">
                  Message on WhatsApp
                  <MessageCircleIcon className="size-4" />
                </span>
              </a>
              <p className="text-sm leading-6 text-neutral-300">
                Owner phone: {PUBLIC_OWNER_WHATSAPP_DISPLAY}
              </p>
              <a
                href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-neutral-300 transition hover:text-neutral-50"
              >
                <MailIcon className="size-4" />
                Prefer email? {PUBLIC_SUPPORT_EMAIL}
              </a>
              <p className="text-sm leading-6 text-neutral-300">
                Use support for device recovery, manual token adjustments,
                billing questions, privacy, or legal requests.
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
                Include the receipt email and redeem code when asking for billing help.
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-3">
                Use Lemon Squeezy receipts and redeem-code emails to reconcile
                orders quickly.
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-3">
                Device recovery, refund handling, and privacy requests are routed
                through the backoffice.
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
              Privacy policy
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
