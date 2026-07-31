import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  DownloadIcon,
  LanguagesIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
  SparklesIcon,
} from "lucide-react";

import { cn } from "@/lib/tailwind/utils";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import heroBackground from "@/features/auth/layout-login-background.webp";
import { androidApkDownload } from "@/features/public/download-assets";
import { PublicSection, PublicShell } from "@/features/public/public-shell";

const workflowSteps = [
  {
    title: "Install Nayovi on Android",
    description: "Download the official APK and open the app on your phone.",
    icon: DownloadIcon,
  },
  {
    title: "Open a chapter",
    description:
      "Choose a manhwa, manga, or manhua chapter from your reading sources.",
    icon: BookOpenCheckIcon,
  },
  {
    title: "Choose your language",
    description:
      "Nayovi detects the text and shows the translation directly on the page.",
    icon: LanguagesIcon,
  },
] as const;

const readerBenefits = [
  {
    title: "Made for manhwa",
    description:
      "Keep scrolling through long vertical chapters without copying every speech bubble into another tool.",
    icon: SmartphoneIcon,
  },
  {
    title: "Translation in the chapter",
    description:
      "See the translated dialogue where you are reading, with the original page still easy to compare.",
    icon: SparklesIcon,
  },
  {
    title: "Simple Android setup",
    description:
      "Install the app, choose a language, and start reading. No complicated setup is required.",
    icon: ShieldCheckIcon,
  },
] as const;

export const translateManhwaAiFaqs = [
  {
    title: "Can Nayovi translate Korean manhwa into English?",
    description:
      "Yes. Open the chapter, select English, and Nayovi translates the detected Korean text directly in the reading view.",
  },
  {
    title: "Does Nayovi also work with manga and manhua?",
    description:
      "Yes. Nayovi is designed for manhwa, manga, and manhua pages, including vertical chapters and traditional page layouts.",
  },
  {
    title: "Is Nayovi available on Android?",
    description:
      "Yes. Nayovi is available as an Android APK from the official download page.",
  },
  {
    title: "Can I try it before paying?",
    description:
      "Yes. You can translate about two average chapters free without entering a payment card, then choose a monthly plan if you want to keep reading.",
  },
] as const;

export const PageTranslateManhwaAi = () => {
  return (
    <PublicShell>
      <section className="relative w-full overflow-hidden bg-neutral-950 px-4 py-10 text-neutral-50 sm:px-7 md:px-10 md:py-12 lg:py-14">
        <img
          src={heroBackground}
          alt=""
          className="absolute inset-0 size-full object-cover object-[62%_center] opacity-75"
        />
        <div className="absolute inset-0 bg-linear-to-r from-neutral-950 via-neutral-950/94 to-neutral-950/65" />
        <div className="absolute inset-0 bg-linear-to-t from-neutral-950 via-transparent to-neutral-950/25" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:min-h-[620px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col gap-6">
            <Badge
              variant="brand"
              size="lg"
              className="w-fit border-white/15 bg-white/10 text-neutral-50 backdrop-blur"
            >
              AI manhwa translator for Android
            </Badge>

            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl">
                Translate manhwa into your language on Android.
              </h1>
              <p className="max-w-xl text-base leading-7 text-neutral-200 md:text-lg">
                Open a manhwa, manga, or manhua chapter, choose your language,
                and read the translated text directly on the page. Try about
                two average chapters free—no card required.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={androidApkDownload.href}
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "min-h-12 bg-brand-300 px-6 text-brand-950 hover:bg-brand-200",
                )}
              >
                <span className="flex items-center gap-2">
                  Download Nayovi APK
                  <DownloadIcon className="size-4" />
                </span>
              </a>
              <a
                href="/pricing"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "min-h-12 border-white/20 bg-white/10 px-6 text-neutral-50 hover:bg-white/15",
                )}
              >
                <span className="flex items-center gap-2">
                  See monthly plans
                  <ArrowRightIcon className="size-4" />
                </span>
              </a>
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-neutral-200">
              {[
                "Android APK",
                "About 2 chapters free",
                "No card required",
                "Manhwa • Manga • Manhua",
              ].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/10 bg-white/8 px-3 py-2 backdrop-blur"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[650px] justify-center lg:justify-end">
            <div className="absolute inset-x-[12%] top-[10%] bottom-[4%] rounded-full bg-brand-400/20 blur-3xl" />
            <img
              src="/marketing/nayovi-manhwa-translation-phone.webp"
              alt="Nayovi Android app showing a Korean manhwa page before translation and the English translation directly on the same chapter"
              width={682}
              height={1565}
              fetchPriority="high"
              className="relative h-auto max-h-[610px] w-auto max-w-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]"
            />
          </div>
        </div>
      </section>

      <PublicSection
        eyebrow="See the result"
        title="Read the original and the translation in the chapter"
        description="The text is translated where it appears on the page, so you can follow the scene without leaving your reader or copying speech bubbles one by one."
        className="pt-10"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-[1.5rem]">
            <CardHeader>
              <CardTitle className="text-lg">Before: the original page</CardTitle>
              <CardDescription>
                Open the Korean, Japanese, or Chinese chapter in your normal
                Android reading flow.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card className="public-brand-panel-muted rounded-[1.5rem]">
            <CardHeader>
              <CardTitle className="text-lg">After: your language</CardTitle>
              <CardDescription>
                Nayovi shows readable translated dialogue directly in the
                chapter while you continue scrolling.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Three simple steps"
        title="From download to a translated chapter"
        description="You do not need to be a developer. The whole setup happens inside a familiar Android reader."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {workflowSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Card key={step.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      Step {index + 1}
                    </span>
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
        eyebrow="Made for readers"
        title="A manhwa-first translator that also works with manga and manhua"
        description="Nayovi is especially comfortable for long vertical manhwa chapters, while keeping the Android workflow familiar to readers who know TachiyomiAT, Tachiyomi, or Mihon."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {readerBenefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <Card key={benefit.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  <CardDescription>{benefit.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Try it first"
        title="Start free, then pay only if it fits your reading"
        description="Translate about two average chapters without a card. If Nayovi becomes part of your weekly reading, monthly plans start at $2—the price of a coffee."
      >
        <Card className="overflow-hidden rounded-[1.75rem] border-brand-300/30">
          <CardContent className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-2">
              <p className="text-xl font-semibold">A simple path to keep reading</p>
              <p className="max-w-2xl leading-7 text-muted-foreground">
                Test a real chapter first. When you need more translations,
                compare the monthly plans and choose the reading volume that
                suits you.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={androidApkDownload.href}
                className={cn(buttonVariants({ size: "lg" }), "min-h-11")}
              >
                Download free
              </a>
              <a
                href="/pricing"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "lg" }),
                  "min-h-11",
                )}
              >
                Compare plans
              </a>
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Questions"
        title="What readers ask about translating manhwa"
        description="The essentials before you install Nayovi on Android."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {translateManhwaAiFaqs.map((faq) => (
            <Card key={faq.title} className="rounded-[1.5rem]">
              <CardHeader>
                <CardTitle className="text-lg">{faq.title}</CardTitle>
                <CardDescription>{faq.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Ready to read?"
        title="Translate your next manhwa chapter in Nayovi"
        description="Download the official Android APK, choose your language, and see how the translation feels on a real chapter."
      >
        <div className="flex flex-wrap gap-3">
          <a
            href={androidApkDownload.href}
            className={cn(buttonVariants({ size: "lg" }), "min-h-12")}
          >
            <span className="flex items-center gap-2">
              Download Nayovi APK
              <DownloadIcon className="size-4" />
            </span>
          </a>
          <a
            href="/pricing"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "min-h-12",
            )}
          >
            See monthly plans
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};
