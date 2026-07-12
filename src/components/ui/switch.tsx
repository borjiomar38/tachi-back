import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/tailwind/utils';

export interface SwitchProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'role'
> {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = ({
  checked,
  className,
  disabled,
  onCheckedChange,
  type = 'button',
  ...props
}: SwitchProps) => (
  <button
    aria-checked={checked}
    className={cn(
      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
      checked && 'bg-primary',
      className
    )}
    disabled={disabled}
    role="switch"
    type={type}
    onClick={() => onCheckedChange?.(!checked)}
    {...props}
  >
    <span
      className={cn(
        'pointer-events-none block size-4 translate-x-0 rounded-full bg-background shadow-sm transition-transform',
        checked && 'translate-x-4'
      )}
    />
  </button>
);
