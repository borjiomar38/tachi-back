import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  BookOpenIcon,
  ChevronDownIcon,
  DownloadIcon,
  LanguagesIcon,
  MessageCircleIcon,
  PlayCircleIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
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
import heroCharacter from "@/features/auth/layout-login-character.webp";
import {
  activationSteps,
  publicHighlights,
  type PublicTokenPack,
  supportFaqs,
} from "@/features/public/data";
import { DemoVideo } from "@/features/public/demo-video";
import { androidApkDownload } from "@/features/public/download-assets";
import { PublicSection, PublicShell } from "@/features/public/public-shell";
import { TokenPackCard } from "@/features/public/token-pack-card";

const stepIcons = [DownloadIcon, BookOpenIcon, LanguagesIcon] as const;
const benefitIcons = [
  BookOpenCheckIcon,
  LanguagesIcon,
  SmartphoneIcon,
] as const;
const trustSignals = [
  { label: "Android APK", icon: SmartphoneIcon },
  { label: "About 2 chapters free", icon: BookOpenIcon },
  { label: "No card required", icon: ShieldCheckIcon },
  { label: "Manhwa • Manga • Manhua", icon: LanguagesIcon },
] as const;

export const PageLanding = (props: {
  contactStatus?: "sent" | "error" | "invalid";
  tokenPacks: PublicTokenPack[];
}) => {
  const freeTokenPack = props.tokenPacks.find(
    (tokenPack) => tokenPack.key === "free",
  );
  const paidTokenPacks = props.tokenPacks.filter(
    (tokenPack) => tokenPack.key !== "free",
  );
  const featuredTokenPack =
    paidTokenPacks.find((tokenPack) => tokenPack.key === "pro") ??
    paidTokenPacks[1] ??
    paidTokenPacks[0];
  const displayedTokenPacks = freeTokenPack
    ? [freeTokenPack, ...paidTokenPacks]
    : paidTokenPacks;

  return (
    <PublicShell compactFooter>
      <section id="hero" className="relative w-full scroll-mt-24">
        <div className="relative isolate overflow-hidden bg-neutral-950 px-4 py-10 text-neutral-50 sm:px-7 md:px-10 md:py-12">
          <img
            src={heroBackground}
            alt=""
            width="1536"
            height="1024"
            loading="eager"
            fetchPriority="high"
            className="absolute inset-0 z-[-30] size-full object-cover object-[62%_center]"
          />
          <div className="absolute inset-0 z-[-20] bg-linear-to-r from-neutral-950 via-neutral-950/78 to-neutral-950/35" />
          <div className="absolute inset-0 z-[-20] bg-[radial-gradient(ellipse_at_52%_46%,rgba(126,34,206,0.14),transparent_58%)]" />
          <div className="absolute inset-0 z-[-20] bg-linear-to-t from-neutral-950 via-neutral-950/15 to-neutral-950/35" />
          <img
            src={heroCharacter}
            alt=""
            width="1024"
            height="1536"
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="pointer-events-none absolute top-[8%] left-[64%] z-[-10] h-auto w-[160vw] max-w-none -translate-x-1/2 opacity-[0.06] contrast-75 saturate-[0.55] blur-[0.4px] sm:left-[58%] sm:w-[115vw] sm:opacity-[0.07] md:top-[2%] md:left-[52%] md:w-[78vw] md:opacity-[0.09] lg:top-[-5%] lg:left-[45%] lg:w-[min(48vw,46rem)] lg:opacity-[0.11]"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[58%] bg-linear-to-b from-neutral-950/88 via-neutral-950/55 to-transparent lg:hidden" />
          <div className="pointer-events-none absolute inset-y-0 left-0 z-0 hidden w-[58%] bg-linear-to-r from-neutral-950 via-neutral-950/65 to-transparent lg:block" />

          <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 lg:min-h-[580px] lg:grid-cols-[0.96fr_1.04fr]">
            <div className="flex flex-col gap-6">
              <Badge
                variant="brand"
                size="lg"
                className="w-fit border-white/15 bg-white/10 text-neutral-50 backdrop-blur"
              >
                Manhwa &amp; manga translator for Android
              </Badge>

              <div className="max-w-2xl space-y-4">
                <h1 className="text-4xl leading-[1.02] font-semibold tracking-tight text-balance md:text-6xl">
                  Read manhwa and manga in your language on Android.
                </h1>
                <p className="max-w-xl text-base leading-7 text-neutral-200 md:text-lg">
                  Open a manhwa, manga, or manhua chapter, choose your language,
                  and keep reading in Nayovi. Try about two average chapters
                  free—no card required.
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
                  href="/#demo"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "min-h-12 gap-2 border-white/20 bg-white/10 px-6 text-neutral-50 hover:bg-white/15",
                  )}
                >
                  <PlayCircleIcon className="size-4" />
                  See how it works
                </a>
              </div>

              <div className="flex max-w-2xl flex-wrap gap-2 text-xs text-neutral-200">
                {trustSignals.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 backdrop-blur"
                    >
                      <Icon className="size-4 text-brand-200" />
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="relative mx-auto flex min-h-[33rem] w-full max-w-[35rem] items-center justify-center sm:min-h-[35rem] lg:min-h-[580px]"
              aria-label="Nayovi Android manhwa translation preview"
            >
              <div className="pointer-events-none absolute inset-x-[18%] top-[14%] bottom-[7%] rounded-full bg-brand-400/20 blur-3xl" />
              <img
                src="/marketing/nayovi-manhwa-translation-phone.webp"
                alt="Nayovi Android reader showing the same manhwa scene in Korean before translation and in English after translation"
                width="682"
                height="1565"
                loading="eager"
                decoding="async"
                className="relative z-10 h-auto max-h-[33rem] w-auto max-w-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.58)] sm:max-h-[35rem] lg:max-h-[580px] lg:-translate-x-10"
              />
            </div>
          </div>
        </div>
      </section>

      <PublicSection
        id="demo"
        eyebrow="Product demo"
        title="See manhwa translation while you read"
        description="Nayovi keeps the original manhwa, manga, or manhua page and its translation in one Android reading flow."
        className="py-8 md:py-10"
      >
        <Card className="public-ink-panel overflow-hidden rounded-[1.75rem] text-neutral-50">
          <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="flex flex-col justify-center p-5 sm:p-6 md:p-8">
              <Badge variant="brand" size="sm" className="w-fit">
                Inside Nayovi
              </Badge>
              <h3 className="mt-4 text-2xl font-semibold">
                Translate without leaving your reader
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-300">
                Keep the source chapter and the translated reading flow together
                instead of switching between apps.
              </p>

              <div className="mt-5 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                <figure className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2.5">
                  <figcaption className="px-1 pb-2 text-xs font-semibold tracking-[0.15em] text-neutral-300 uppercase">
                    Before · Korean
                  </figcaption>
                  <div className="aspect-[6/5] overflow-hidden rounded-xl bg-neutral-950">
                    <img
                      src="/marketing/nayovi-manhwa-translation-phone.webp"
                      alt="Korean manhwa page before translation in Nayovi"
                      width="682"
                      height="1565"
                      loading="lazy"
                      className="size-full object-cover object-[50%_25%]"
                    />
                  </div>
                </figure>
                <div className="flex justify-center text-brand-200">
                  <ArrowRightIcon className="size-5 rotate-90 sm:rotate-0" />
                </div>
                <figure className="overflow-hidden rounded-2xl border border-brand-300/25 bg-brand-300/10 p-2.5">
                  <figcaption className="px-1 pb-2 text-xs font-semibold tracking-[0.15em] text-brand-100 uppercase">
                    After · English
                  </figcaption>
                  <div className="aspect-[6/5] overflow-hidden rounded-xl bg-neutral-950">
                    <img
                      src="/marketing/nayovi-manhwa-translation-phone.webp"
                      alt="The same manhwa page translated into English inside Nayovi"
                      width="682"
                      height="1565"
                      loading="lazy"
                      className="size-full object-cover object-[50%_90%]"
                    />
                  </div>
                </figure>
              </div>

              <details className="group mt-5 rounded-2xl border border-white/10 bg-black/20">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <PlayCircleIcon className="size-4 text-brand-200" />
                    Watch the real Android walkthrough
                  </span>
                  <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
                </summary>
                <DemoVideo className="border-t border-white/10" />
              </details>
            </div>

            <div className="relative flex min-h-[24rem] items-end justify-center overflow-hidden border-t border-white/10 bg-[radial-gradient(circle_at_50%_25%,rgba(168,85,247,0.22),transparent_48%)] px-6 pt-6 lg:h-[28rem] lg:min-h-0 lg:self-start lg:border-t-0 lg:border-l">
              <img
                src="/marketing/nayovi-history-phone.webp"
                srcSet="/marketing/nayovi-history-phone-480w.webp 480w, /marketing/nayovi-history-phone.webp 864w"
                sizes="197px"
                alt="Real Nayovi Android history screen showing recently read chapters"
                width="864"
                height="1821"
                loading="lazy"
                fetchPriority="low"
                decoding="async"
                className="max-h-[26rem] w-auto max-w-full object-contain object-bottom drop-shadow-2xl"
              />
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="How it works"
        title="From download to reading in three steps"
        description="No complicated setup."
        className="py-8 md:py-10"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {activationSteps.map((step, index) => {
            const Icon = stepIcons[index] ?? BookOpenIcon;

            return (
              <Card key={step.title} className="rounded-[1.35rem]">
                <CardHeader className="gap-0 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-300/15 text-brand-200 ring-1 ring-brand-300/20">
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-1.5">
                      <CardTitle className="text-base">{step.title}</CardTitle>
                      <CardDescription className="leading-6">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Made for readers"
        title="Simple enough to use on the first chapter"
        className="py-8 md:py-10"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {publicHighlights.map((item, index) => {
            const Icon = benefitIcons[index] ?? ShieldCheckIcon;

            return (
              <Card key={item.title} className="rounded-[1.35rem]">
                <CardHeader className="gap-0 p-5">
                  <div className="flex items-start gap-4">
                    <Icon className="mt-0.5 size-6 shrink-0 text-brand-200" />
                    <div className="space-y-1.5">
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="leading-6">
                        {item.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        id="pricing"
        eyebrow="Plans"
        title="Start free. Upgrade when you need more."
        description="Try Nayovi first, then choose a monthly plan that matches how much you read."
        className="py-8 text-center md:py-10"
      >
        <div className="grid gap-4 text-left sm:grid-cols-2 xl:grid-cols-4">
          {displayedTokenPacks.map((tokenPack) => (
            <TokenPackCard
              key={tokenPack.id}
              tokenPack={tokenPack}
              compact
              featured={tokenPack.id === featuredTokenPack?.id}
              id={tokenPack.key === "starter" ? "starter-plan" : undefined}
              showCoffeePrice={tokenPack.key === "starter"}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-3 rounded-[1.35rem] border border-border/70 bg-card/70 px-5 py-4 text-left text-sm leading-6 text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>
            Chapter amounts are estimates and can vary with chapter length. Paid
            plans renew monthly until cancelled, and unused allowance resets at
            renewal.
          </p>
          <a
            href="/pricing"
            className="shrink-0 font-medium text-foreground hover:text-primary"
          >
            Compare plans →
          </a>
        </div>
      </PublicSection>

      <section
        id="contact"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-8 md:py-10"
      >
        <div className="public-brand-panel flex flex-col gap-5 rounded-[1.5rem] border p-5 text-neutral-50 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-300/15 text-brand-200 ring-1 ring-brand-300/20">
              <MessageCircleIcon className="size-5" />
            </span>
            <div>
              <p className="text-lg font-semibold">Need help before you start?</p>
              <p className="mt-1 text-sm leading-6 text-neutral-300">
                Get help with installation, payment, activation, or account
                access in the Nayovi support center.
              </p>
              {props.contactStatus ? (
                <p className="mt-2 text-xs font-medium text-brand-100">
                  {props.contactStatus === "sent"
                    ? "Your message was sent. We will reply by email."
                    : props.contactStatus === "invalid"
                      ? "Complete every field with a valid email address."
                      : "The message could not be sent. Please try again."}
                </p>
              ) : null}
            </div>
          </div>
          <a
            href="/support"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "shrink-0",
            )}
          >
            Open support center
            <ArrowRightIcon className="size-4" />
          </a>
        </div>
      </section>

      <PublicSection
        id="faq"
        eyebrow="FAQ"
        title="Questions readers ask before trying Nayovi"
        className="pt-8 pb-16 text-center md:pt-10 md:pb-20"
      >
        <div className="mx-auto grid max-w-5xl items-start gap-3 text-left lg:grid-cols-2">
          {supportFaqs.map((item) => (
            <details
              key={item.title}
              className="group rounded-2xl border border-border/80 bg-card/75 shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-medium transition hover:text-primary [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-3">
                  <LanguagesIcon className="size-5 shrink-0 text-brand-200" />
                  {item.title}
                </span>
                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="border-t border-border/70 px-5 py-4 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            </details>
          ))}
        </div>
      </PublicSection>
    </PublicShell>
  );
};
