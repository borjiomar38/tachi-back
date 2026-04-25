import { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Logo } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import { PUBLIC_SUPPORT_EMAIL } from '@/features/public/data';
import { androidApkDownload } from '@/features/public/download-assets';

const primaryLinks = [
  { href: '/#hero', label: 'Overview' },
  { href: '/#demo', label: 'Demo' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#contact', label: 'Contact' },
  { href: '/#faq', label: 'FAQ' },
] as const;

const legalLinks = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
] as const;

export const PublicShell = (props: { children: ReactNode }) => {
  return (
    <div className="min-h-dvh bg-neutral-50 text-foreground dark:bg-neutral-950">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-br from-warning-100/70 via-white to-positive-100/60 blur-3xl dark:from-warning-950/20 dark:via-neutral-950 dark:to-positive-950/20" />
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <a href="/" className="flex items-center gap-3">
              <Logo variant="mark" className="size-10 md:hidden" />
              <Logo className="hidden w-28 md:block" />
            </a>
            <nav className="hidden items-center gap-5 md:flex">
              {primaryLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="hidden items-center gap-2 md:flex">
              <a
                href={androidApkDownload.href}
                className={buttonVariants({ variant: 'default', size: 'sm' })}
              >
                APK
              </a>
              <a
                href="/download"
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                Download page
              </a>
              <a
                href="/login"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                Staff login
              </a>
            </div>
          </div>
        </header>
        <main className="relative">{props.children}</main>
        <footer className="relative border-t border-border/70 bg-background/95">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 md:flex-row md:justify-between">
            <div className="max-w-xl space-y-3">
              <Logo className="w-32" />
              <p className="text-sm text-muted-foreground">
                Tachiyomi Back is the hosted backend and backoffice roadmap for
                OCR, translation, payments, licenses, devices, and support
                operations around TachiyomiAT.
              </p>
              <p className="text-sm text-muted-foreground">
                Hosted mode is not live in the Android app yet. Current builds
                still rely on local translators and user-supplied provider keys.
              </p>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Product</h2>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {primaryLinks.map((item) => (
                    <a key={item.href} href={item.href} className="hover:text-foreground">
                      {item.label}
                    </a>
                  ))}
                  <a href={androidApkDownload.href} className="hover:text-foreground">
                    Download APK
                  </a>
                  <a href="/download" className="hover:text-foreground">
                    Install guide
                  </a>
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Legal</h2>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {legalLinks.map((item) => (
                    <a key={item.href} href={item.href} className="hover:text-foreground">
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="text-sm font-semibold">Support</h2>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <a href="/support" className="hover:text-foreground">
                    Support center
                  </a>
                  <a
                    href={`mailto:${PUBLIC_SUPPORT_EMAIL}`}
                    className="hover:text-foreground"
                  >
                    {PUBLIC_SUPPORT_EMAIL}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export const PublicSection = (props: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) => {
  return (
    <section
      id={props.id}
      className={cn(
        'mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-12 md:py-16',
        props.className
      )}
    >
      <div className="mb-8 max-w-3xl space-y-3">
        {props.eyebrow ? (
          <Badge variant="warning" size="sm">
            {props.eyebrow}
          </Badge>
        ) : null}
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {props.title}
        </h2>
        {props.description ? (
          <p className="text-base leading-7 text-muted-foreground md:text-lg">
            {props.description}
          </p>
        ) : null}
      </div>
      {props.children}
    </section>
  );
};
