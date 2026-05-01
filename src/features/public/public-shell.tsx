import { useRouterState } from '@tanstack/react-router';
import {
  BookOpenTextIcon,
  CircleHelpIcon,
  DownloadIcon,
  HomeIcon,
  TagsIcon,
} from 'lucide-react';
import { ReactNode } from 'react';

import { cn } from '@/lib/tailwind/utils';

import { Logo } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';

import {
  PUBLIC_OWNER_WHATSAPP_DISPLAY,
  PUBLIC_OWNER_WHATSAPP_HREF,
  PUBLIC_SUPPORT_EMAIL,
} from '@/features/public/data';
import { androidApkDownload } from '@/features/public/download-assets';

const primaryLinks = [
  { href: '/#hero', label: 'Home' },
  { href: '/#demo', label: 'Demo' },
  { href: '/#pricing', label: 'Plans' },
  { href: '/blog', label: 'Blog' },
  { href: '/guides/mihon-tachiyomiat-setup', label: 'Guides' },
  { href: '/#contact', label: 'Contact' },
  { href: '/#faq', label: 'FAQ' },
] as const;

const legalLinks = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/official-sources-takedown', label: 'Sources & takedown' },
] as const;

const mobileTabs = [
  {
    href: '/',
    label: 'Home',
    icon: HomeIcon,
    isActive: (pathname: string) => pathname === '/',
  },
  {
    href: '/download',
    label: 'Download',
    icon: DownloadIcon,
    isActive: (pathname: string) => pathname === '/download',
  },
  {
    href: '/pricing',
    label: 'Plans',
    icon: TagsIcon,
    isActive: (pathname: string) => pathname === '/pricing',
  },
  {
    href: '/blog',
    label: 'Blog',
    icon: BookOpenTextIcon,
    isActive: (pathname: string) => pathname.startsWith('/blog'),
  },
  {
    href: '/support',
    label: 'Support',
    icon: CircleHelpIcon,
    isActive: (pathname: string) => pathname === '/support',
  },
] as const;

export const PublicShell = (props: { children: ReactNode }) => {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  return (
    <div className="public-client-shell min-h-dvh text-foreground">
      <div className="relative overflow-hidden pb-20 md:pb-0">
        <div className="public-client-ambient pointer-events-none absolute inset-x-0 top-0 h-80" />
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-3 px-4 py-3 md:grid-cols-[auto_1fr_auto]">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-3 md:justify-start"
              aria-label="TachiyomiAT"
            >
              <Logo variant="mark" className="size-14 shrink-0" />
              <span className="text-2xl font-extrabold tracking-normal text-foreground">
                Tachiyomi{' '}
                <span className="font-black" style={{ color: 'var(--logo-accent)' }}>
                  AT
                </span>
              </span>
            </a>
            <nav className="hidden items-center justify-center gap-5 md:flex">
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
            <div className="hidden items-center justify-end gap-2 md:flex">
              <a
                href={androidApkDownload.href}
                className={buttonVariants({ variant: 'default', size: 'sm' })}
              >
                Download APK
              </a>
              <a
                href="/login"
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                Sign in
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
                The Android app connects to hosted plans through redeem codes,
                device activation, token accounting, and forced update checks.
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
                  <a
                    href="/guides/mihon-tachiyomiat-setup"
                    className="hover:text-foreground"
                  >
                    Setup guide
                  </a>
                  <a
                    href="/guides/translation-support-workflow"
                    className="hover:text-foreground"
                  >
                    Translation workflow
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
                  <a
                    href={PUBLIC_OWNER_WHATSAPP_HREF}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-foreground"
                  >
                    WhatsApp {PUBLIC_OWNER_WHATSAPP_DISPLAY}
                  </a>
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
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 pb-safe-bottom shadow-lg backdrop-blur md:hidden">
          <div className="mx-auto grid max-w-6xl grid-cols-5 px-2 py-2">
            {mobileTabs.map((item) => {
              const Icon = item.icon;
              const active = item.isActive(pathname);

              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground',
                    active && 'bg-primary/10 text-primary ring-1 ring-primary/15'
                  )}
                >
                  <Icon className="size-5" />
                  <span className="truncate">{item.label}</span>
                </a>
              );
            })}
          </div>
        </nav>
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
          <Badge variant="brand" size="sm">
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
