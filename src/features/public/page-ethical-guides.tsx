import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  FileCheck2Icon,
  LanguagesIcon,
  ScaleIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from 'lucide-react';

import { cn } from '@/lib/tailwind/utils';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { androidApkDownload } from '@/features/public/download-assets';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

const setupSteps = [
  {
    icon: SmartphoneIcon,
    title: 'Use official installs',
    description:
      'Download TachiyomiAT from this site and use official Mihon or reader project channels when you need a separate reader. Avoid patched APKs and unknown mirrors.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Keep provider keys off the device',
    description:
      'Hosted OCR and translation requests go through the TachiyomiAT backend, so the Android client does not need user-managed OCR or translation API keys.',
  },
  {
    icon: BookOpenCheckIcon,
    title: 'Bring permission-safe content',
    description:
      'Process only content you own, content in the public domain, creator-provided samples, official previews, or material you have permission to translate.',
  },
  {
    icon: FileCheck2Icon,
    title: 'Use support for recovery',
    description:
      'Redeem-code, payment, installation, and device recovery questions should go through support instead of public extension or source-sharing threads.',
  },
] as const;

const workflowSteps = [
  {
    title: '1. Check permission first',
    description:
      'Confirm that the page, sample, or chapter can be processed before uploading it for OCR or translation. Do not use the workflow for licensed rips, paywalled chapters, or unauthorized uploads.',
  },
  {
    title: '2. Prepare clean inputs',
    description:
      'Use readable pages, avoid unnecessary crops, and keep the original context available so reviewers can compare the OCR result against the source material.',
  },
  {
    title: '3. Keep a glossary',
    description:
      'Record character names, place names, technique terms, honorific choices, and recurring UI text so future chapters stay consistent.',
  },
  {
    title: '4. Review before sharing',
    description:
      'A human reviewer should check tone, missing bubbles, mistranslated names, and layout issues before any permission-safe translation note is shared publicly.',
  },
  {
    title: '5. Credit and remove quickly',
    description:
      'Credit contributors where appropriate and keep a clear route for rights holders or creators to request removal, correction, or review.',
  },
] as const;

const sourceBoundaries = [
  {
    title: 'Allowed sources',
    description:
      'Creator-owned material, public-domain works, official samples, official previews, licensed personal-use pages where processing is permitted, and material with explicit rights-holder permission.',
  },
  {
    title: 'Not allowed',
    description:
      'Licensed rips, unauthorized scan uploads, ad-heavy chapter mirrors, paywall bypasses, paid fan-translation leaks, or any source promoted mainly as free access to copyrighted chapters.',
  },
  {
    title: 'What TachiyomiAT provides',
    description:
      'The service provides Android setup, redeem-code activation, hosted OCR, translation processing, source-discovery support, and customer support. It does not sell or host manga chapters.',
  },
] as const;

const takedownSteps = [
  'Send the request to support with the work title, affected TachiyomiAT URL or feature, your rights-holder relationship, and a reliable contact address.',
  'Include enough detail for the support team to identify the reported material or workflow output without exposing unrelated private files.',
  'TachiyomiAT can remove public references, disable hosted processing where appropriate, preserve abuse evidence, and cooperate with lawful requests.',
  'Good-faith correction requests are welcome for attribution, terminology, source labeling, and policy wording.',
] as const;

export const PageMihonTachiyomiSetupGuide = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Setup guide"
        title="Mihon and TachiyomiAT setup guide"
        description="Set up TachiyomiAT as a hosted OCR and translation workflow without turning the project into a chapter source, extension list, or piracy index."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {setupSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
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
        eyebrow="Safe setup"
        title="Recommended first run"
        description="This sequence keeps installation, activation, and policy checks clear before any translation job is processed."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Download TachiyomiAT from the official APK link on this site.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Review the terms and confirm your use is limited to owned,
              permissioned, public-domain, or official sample material.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Activate hosted mode with a redeem code and run a small test page
              before processing larger batches.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Use support for billing, device recovery, setup issues, or policy
              questions.
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Next"
        title="Continue with the workflow"
        description="After installation, use the translation workflow guide for review, glossary, and takedown-ready handling."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/guides/translation-support-workflow"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Translation workflow
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href={androidApkDownload.href}
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Download APK
          </a>
          <a
            href="/legal/official-sources-takedown"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Source and takedown policy
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageTranslationSupportWorkflow = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Translation workflow"
        title="Translation support workflow"
        description="Use this workflow for permission-safe review, glossary control, and hosted OCR or translation support. It is not a guide for distributing unauthorized chapters."
        className="pt-10"
      >
        <div className="grid gap-4">
          {workflowSteps.map((step) => (
            <Card key={step.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Quality bar"
        title="Review standards"
        description="Good translation support is slower than a raw OCR pass, but it avoids confusing names, missing bubbles, and policy problems."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: LanguagesIcon,
              title: 'Terminology',
              description:
                'Keep recurring names, ranks, techniques, locations, and honorific choices stable across pages.',
            },
            {
              icon: ShieldCheckIcon,
              title: 'Permission',
              description:
                'Stop the workflow when permission is unclear or a source looks like a rip, mirror, or paywall bypass.',
            },
            {
              icon: ScaleIcon,
              title: 'Accountability',
              description:
                'Keep credits, reviewer notes, and removal routes easy to find for contributors and rights holders.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="rounded-[1.5rem]">
                <CardHeader className="gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-neutral-950 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-950">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Policy"
        title="Keep the workflow linkable"
        description="Directories and communities are more likely to accept a project when the public pages make the legal boundary clear."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/legal/official-sources-takedown"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Official sources policy
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/guides/mihon-tachiyomiat-setup"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Setup guide
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageOfficialSourcesTakedown = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="Policy"
        title="Official sources and takedown policy"
        description="TachiyomiAT is for hosted OCR, translation support, activation, and troubleshooting. It does not host manga chapters or promote unauthorized chapter access."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {sourceBoundaries.map((item) => (
            <Card key={item.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Takedown"
        title="How to request review or removal"
        description="Rights holders, creators, publishers, and authorized representatives can request review when they believe TachiyomiAT public pages, hosted processing, or support material involves unauthorized content."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {takedownSteps.map((step) => (
              <div key={step} className="rounded-xl border border-border/70 px-4 py-3">
                {step}
              </div>
            ))}
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Boundary"
        title="Community and directory submissions"
        description="Use this page when explaining TachiyomiAT to directories, moderators, contributors, or reviewers who need to verify the project is a tool, not a chapter-hosting site."
        className="pb-20"
      >
        <div className="flex flex-wrap gap-3">
          <a
            href="/support"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }))}
          >
            <span className="flex items-center gap-2">
              Contact support
              <ArrowRightIcon className="size-4" />
            </span>
          </a>
          <a
            href="/legal/terms"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Terms of service
          </a>
          <a
            href="/guides/translation-support-workflow"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Translation workflow
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};
