import type { SVGProps } from 'react';

import { cn } from '@/lib/tailwind/utils';

export const Logo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 456 108"
    fill="none"
    {...props}
    className={cn('text-foreground', props.className)}
  >
    <title>TachiyomiAT</title>
    <rect x="6" y="6" width="96" height="96" rx="28" fill="#2E3943" />
    <circle cx="54" cy="54" r="30" fill="#F2FAFF" />
    <circle cx="54" cy="54" r="34" stroke="#0058CA" strokeWidth="8" />
    <circle cx="79" cy="78" r="7" fill="#006E1B" />
    <path
      d="M43.7 45.8H52.5V43.2H55.2V45.8H63.9V48.4H60.5C60.4 50.4 59.9 53.3 55.7 57.5C56.2 58.1 63.9 62.9 64.1 63.1C64 63.3 62.2 64.8 62.2 64.8C60.7 64.4 54.9 60.3 53.8 59.2C53.2 59.9 49.3 62.8 46 64.3C46 64.3 44.2 62.4 44.2 62.4C48.5 60.7 51.9 58 52.2 57.7C50.2 55.9 48.1 52.7 47.8 51.2H50.8C51.4 53.2 53.4 55.6 54.1 56.1C56.4 54.1 57.9 50.9 57.9 48.6H43.8L43.7 45.8Z"
      fill="#2E3943"
    />
    <text
      x="126"
      y="48"
      fill="currentColor"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      fontSize="36"
      fontWeight="800"
      letterSpacing="-0.03em"
    >
      Tachiyomi
    </text>
    <text
      x="319"
      y="48"
      fill="#0058CA"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      fontSize="36"
      fontWeight="900"
      letterSpacing="-0.03em"
    >
      AT
    </text>
    <rect x="128" y="64" width="76" height="28" rx="14" fill="#D9E2FF" />
    <text
      x="144"
      y="83"
      fill="#0058CA"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      fontSize="16"
      fontWeight="800"
      letterSpacing="0.08em"
    >
      BACK
    </text>
    <text
      x="220"
      y="83"
      fill="currentColor"
      fontFamily="ui-sans-serif, system-ui, sans-serif"
      fontSize="16"
      fontWeight="600"
      letterSpacing="-0.01em"
      opacity="0.72"
    >
      mobile reader + translation
    </text>
  </svg>
);
