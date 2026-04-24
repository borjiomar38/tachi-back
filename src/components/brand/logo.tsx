import type { SVGProps } from 'react';

import { cn } from '@/lib/tailwind/utils';

export const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 456 108"
    fill="none"
    role="img"
    {...props}
    className={cn('text-foreground', props.className)}
  >
    <title>TachiyomiAT</title>
    <image
      href="/tachiyomiat-mark.svg"
      width="108"
      height="108"
      preserveAspectRatio="xMinYMid meet"
    />
    <text
      x="126"
      y="48"
      fill="currentColor"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      fontSize="36"
      fontWeight="800"
    >
      Tachiyomi
    </text>
    <text
      x="319"
      y="48"
      fill="#7C3AED"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      fontSize="36"
      fontWeight="900"
    >
      AT
    </text>
    <rect x="128" y="64" width="80" height="28" rx="14" fill="#F1E8FF" />
    <text
      x="144"
      y="83"
      fill="#6D28D9"
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
  </svg>
);
