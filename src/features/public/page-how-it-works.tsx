import {
  BookOpenIcon,
  DownloadIcon,
  LanguagesIcon,
  MailCheckIcon,
} from "lucide-react";

import { cn } from "@/lib/tailwind/utils";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { activationSteps } from "@/features/public/data";
import { DemoVideo } from "@/features/public/demo-video";
import { androidApkDownload } from "@/features/public/download-assets";
import { PublicSection, PublicShell } from "@/features/public/public-shell";

const stepIcons = [DownloadIcon, BookOpenIcon, LanguagesIcon] as const;

export const PageHowItWorks = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="How it works"
        title="Translate manhwa and manga without leaving your Android reader"
        description="Nayovi turns a technical translation process into three simple steps."
        className="pt-12 md:pt-16"
        titleAs="h1"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {activationSteps.map((step, index) => {
            const Icon = stepIcons[index] ?? BookOpenIcon;

            return (
              <Card key={step.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-300/15 text-brand-200 ring-1 ring-brand-300/20">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{step.title}</CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        id="demo"
        eyebrow="Demo"
        title="Watch the real Android flow"
        description="See where translation lives inside Nayovi before you install it."
      >
        <Card className="public-ink-panel overflow-hidden rounded-[1.75rem] text-neutral-50">
          <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.2fr_0.8fr]">
            <DemoVideo />
            <div className="flex flex-col justify-center p-6 md:p-8">
              <h3 className="text-2xl font-semibold">Try the actual product</h3>
              <p className="mt-3 text-sm leading-7 text-neutral-300">
                Start with about two average chapters free. If Nayovi becomes
                part of your reading, choose a monthly plan by chapter volume.
              </p>
              <a
                href={androidApkDownload.href}
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "mt-5 w-fit",
                )}
              >
                Download Nayovi APK
              </a>
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="After purchase"
        title="Activate your plan once in Nayovi"
        description="Payment and activation stay simple even when you buy from the website."
        className="pb-20"
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardHeader className="gap-3 md:flex-row md:items-center">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-300/15 text-brand-950 dark:text-brand-100">
              <MailCheckIcon className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg">
                Check the email used at checkout
              </CardTitle>
              <CardDescription className="text-brand-950/75 dark:text-brand-100/80">
                After payment confirmation, Nayovi sends your receipt and
                activation instructions. Enter the activation code once in the
                app, then continue reading.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a
              href="/pricing"
              className={buttonVariants({ variant: "default", size: "lg" })}
            >
              Compare plans
            </a>
            <a
              href="/support"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Get help
            </a>
          </CardContent>
        </Card>
      </PublicSection>
    </PublicShell>
  );
};
