import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import '@/lib/dayjs/config';
import '@/lib/i18n';
import '@fontsource-variable/inter';

import { QueryClientProvider } from '@/lib/tanstack-query/provider';

import { Sonner } from '@/components/ui/sonner';

export const Providers = (props: { children: ReactNode }) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      storageKey="theme"
      disableTransitionOnChange
      forcedTheme="dark"
    >
      <QueryClientProvider>
        {props.children}
        <Sonner />
      </QueryClientProvider>
    </ThemeProvider>
  );
};
