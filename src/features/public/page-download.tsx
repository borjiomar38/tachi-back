import { ArrowRightIcon, DownloadIcon, KeyRoundIcon, SmartphoneIcon } from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { PublicSection, PublicShell } from '@/features/public/public-shell';

export const PageDownload = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Download"
        title="Download guidance without overpromising hosted mode"
        description="This page should help visitors understand what TachiyomiAT can do today and what will only exist after the hosted backend integration is complete."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-[1.5rem]">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                <SmartphoneIcon className="size-5" />
              </div>
              <CardTitle className="text-xl">What the app does today</CardTitle>
              <CardDescription>
                The current Android build still relies on local translation
                modes and user-supplied API keys for hosted providers.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border/70 px-3 py-3">
                On-device translation is available through ML Kit.
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-3">
                API-based translators currently expect the user to provide their
                own provider credentials.
              </div>
              <div className="rounded-xl border border-border/70 px-3 py-3">
                This website does not distribute a hosted-mode Android build
                yet.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[1.5rem] border-neutral-900 bg-neutral-950 text-neutral-50">
            <CardHeader className="gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-neutral-50">
                <KeyRoundIcon className="size-5" />
              </div>
              <CardTitle className="text-xl">What hosted mode will add</CardTitle>
              <CardDescription className="text-neutral-300">
                The backend roadmap replaces exposed provider keys with token
                packs, redeem codes, device binding, and server-side provider
                routing.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-neutral-300">
              <div className="rounded-xl border border-white/10 px-3 py-3">
                Pay for token packs on the public website.
              </div>
              <div className="rounded-xl border border-white/10 px-3 py-3">
                Redeem against an app installation instead of a user account.
              </div>
              <div className="rounded-xl border border-white/10 px-3 py-3">
                Run OCR and translation through the backend without shipping
                provider keys to the device.
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Distribution note"
        title="Keep the download messaging honest"
        description="Until Android integration ships, the public site should guide users rather than pretend a hosted-enabled build already exists."
        className="pb-20"
      >
        <Card className="rounded-[1.5rem] border-warning-200 bg-warning-50/80 dark:border-warning-900/60 dark:bg-warning-950/15">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">Recommended copy boundary</CardTitle>
            <CardDescription className="text-warning-900 dark:text-warning-100">
              Tell visitors that TachiyomiAT is available today, but hosted mode
              is still under implementation. Do not advertise checkout,
              redeem-code activation, or backend job processing as already
              shipped in Android.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a
              href="/how-it-works"
              className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
            >
              <span className="flex items-center gap-2">
                Hosted flow preview
                <ArrowRightIcon className="size-4" />
              </span>
            </a>
            <a
              href="/support"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              Contact support
            </a>
            <a
              href="/"
              className={buttonVariants({ variant: 'ghost', size: 'lg' })}
            >
              <span className="flex items-center gap-2">
                Back to overview
                <DownloadIcon className="size-4" />
              </span>
            </a>
          </CardContent>
        </Card>
      </PublicSection>
    </PublicShell>
  );
};
