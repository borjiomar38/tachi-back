import { Link } from '@tanstack/react-router';
import { ReactNode } from 'react';

import { Logo } from '@/components/brand/logo';
import { LocalSwitcher } from '@/components/ui/local-switcher';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';

import background from './layout-login-background.webp';
import character from './layout-login-character.webp';

export const LayoutLogin = (props: {
  children?: ReactNode;
  footer?: ReactNode;
}) => {
  return (
    <div
      className="auth-login-shell flex min-h-svh flex-1 bg-background pt-safe-top pb-safe-bottom text-foreground"
      data-testid="layout-login"
    >
      <div className="grid min-h-svh w-full lg:grid-cols-[minmax(26rem,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex min-w-0 flex-col px-5 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2 font-medium"
            >
              <Logo variant="compact" className="w-24 max-w-full sm:w-28" />
            </Link>
            <div className="flex shrink-0 flex-wrap justify-end gap-x-3 gap-y-2">
              <ThemeSwitcher iconOnly />
              <LocalSwitcher />
            </div>
          </div>
          <div className="relative mt-6 h-28 overflow-hidden rounded-md border border-border/70 bg-neutral-950 shadow-xs sm:h-32 lg:hidden">
            <img
              src={background}
              alt=""
              className="absolute inset-0 size-full object-cover object-[62%_42%]"
            />
            <div className="absolute inset-0 bg-linear-to-r from-background/20 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-transparent" />
            <img
              src={character}
              alt=""
              className="animate-float-in-space absolute right-2 bottom-[-46%] w-28 max-w-[38%] sm:w-36"
            />
          </div>
          <div className="mt-8 flex flex-1 items-start justify-center sm:mt-10 lg:mt-0 lg:items-center">
            <div className="w-full max-w-sm sm:max-w-md">{props.children}</div>
          </div>
          {props.footer}
        </div>
        <div className="relative hidden min-h-svh overflow-hidden border-l border-border/60 bg-neutral-950 lg:block">
          <img
            src={background}
            alt=""
            className="absolute inset-0 size-full object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 bg-linear-to-r from-background/35 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-black/10" />
          <div className="absolute right-[-3%] bottom-[-14%] w-[min(72%,42rem)]">
            <img
              src={character}
              alt=""
              className="animate-float-in-space w-full drop-shadow-[0_28px_48px_rgba(0,0,0,0.42)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
