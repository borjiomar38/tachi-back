import type { SVGProps } from 'react';

import { cn } from '@/lib/tailwind/utils';

type LogoProps = SVGProps<SVGSVGElement> & {
  variant?: 'full' | 'compact' | 'mark';
};

export const Logo = ({ variant = 'full', ...props }: LogoProps) => (
  <svg
    viewBox={
      variant === 'mark'
        ? '0 0 108 108'
        : variant === 'compact'
          ? '0 0 380 108'
          : '0 0 456 108'
    }
    fill="none"
    role="img"
    {...props}
    className={cn('text-foreground', props.className)}
  >
    <title>TachiyomiAT</title>
    <image
      href="/tachiyomiat-mark-light.png"
      className="dark:hidden"
      width="108"
      height="108"
      preserveAspectRatio="xMinYMid meet"
    />
    <image
      href="/tachiyomiat-mark-dark.png"
      className="hidden dark:block"
      width="108"
      height="108"
      preserveAspectRatio="xMinYMid meet"
    />
    {variant !== 'mark' && (
      <>
        <text
          x="126"
          y={variant === 'compact' ? '66' : '48'}
          fill="currentColor"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize={variant === 'compact' ? '42' : '36'}
          fontWeight="800"
        >
          Tachiyomi
        </text>
        <text
          x={variant === 'compact' ? '336' : '319'}
          y={variant === 'compact' ? '66' : '48'}
          fill="var(--logo-accent)"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
          fontSize={variant === 'compact' ? '42' : '36'}
          fontWeight="900"
        >
          AT
        </text>
        {variant === 'full' && (
          <>
            <rect
              x="128"
              y="64"
              width="80"
              height="28"
              rx="14"
              fill="var(--logo-accent-soft)"
            />
            <text
              x="144"
              y="83"
              fill="var(--logo-accent-strong)"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="16"
              fontWeight="800"
              letterSpacing="0.08em"
            >
              BACK
            </text>
            <text
              x="222"
              y="83"
              fill="currentColor"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              fontSize="16"
              fontWeight="600"
              opacity="0.72"
            >
              mobile reader + translation
            </text>
          </>
        )}
      </>
    )}
  </svg>
);
