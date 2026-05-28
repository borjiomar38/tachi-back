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
      'Download Nayovi from this site and use official Mihon, Tachiyomi, or TachiyomiAT project channels when you need a separate reader. Avoid patched APKs and unknown mirrors.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Keep provider keys off the device',
    description:
      'Hosted OCR and translation requests go through the Nayovi backend, so the Android client does not need user-managed OCR or translation API keys.',
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

const readerLineageNotes = [
  {
    title: 'For TachiyomiAT searches',
    description:
      'Nayovi is the current branded Android APK and hosted translation path for readers who arrive from TachiyomiAT setup or TachiyomiAT download searches.',
  },
  {
    title: 'For Tachiyomi and Mihon readers',
    description:
      'Readers familiar with Tachiyomi or Mihon-style workflows can keep the same Android-first reading habit while using Nayovi for hosted OCR, AI translation, activation, and support.',
  },
  {
    title: 'Keep sources separate',
    description:
      'Use official reader project channels for reader setup and use Nayovi for translation support. Nayovi does not host manga chapters, extension lists, or unauthorized chapter sources.',
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

const ocrChecklistRows = [
  {
    checkpoint: 'Text detection',
    detail:
      'Confirm speech bubbles, narration boxes, vertical text, sound effects, and small UI labels are captured before judging translation quality.',
  },
  {
    checkpoint: 'Reading order',
    detail:
      'Compare the OCR blocks against panel order so short replies, side comments, and long-strip manhwa panels do not get translated out of context.',
  },
  {
    checkpoint: 'Glossary consistency',
    detail:
      'Track names, places, ranks, attacks, honorifics, and recurring terms in one reviewer note before processing another chapter or sample.',
  },
  {
    checkpoint: 'Human review decision',
    detail:
      'Mark whether the result is ready for private reading, needs correction, or should not be shared because permission or source quality is unclear.',
  },
] as const;

const glossaryChecklistRows = [
  {
    checkpoint: 'Names and relationships',
    reviewerQuestion:
      'Are character names, aliases, honorifics, family terms, and speaker relationships stable across the approved sample?',
    partnerSignal:
      'Reviewers can spot repeat-use quality instead of judging one isolated translated bubble.',
  },
  {
    checkpoint: 'World terms',
    reviewerQuestion:
      'Are ranks, powers, guild names, places, items, and recurring jokes captured in one glossary before more pages are processed?',
    partnerSignal:
      'Partners see whether Nayovi can preserve manhwa context across a weekly reading habit.',
  },
  {
    checkpoint: 'OCR order',
    reviewerQuestion:
      'Do speech bubbles, side comments, narration boxes, vertical text, and long-strip panel order match the original page?',
    partnerSignal:
      'Directory editors and reviewers get a concrete way to separate app workflow quality from generic OCR output.',
  },
  {
    checkpoint: 'Human decision',
    reviewerQuestion:
      'Is the sample marked private-use ready, needs correction, or blocked because permission, source quality, or terminology is unclear?',
    partnerSignal:
      'Pilot traffic stays tied to responsible review, support, and paid intent rather than raw translation volume.',
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
    title: 'What Nayovi provides',
    description:
      'The service provides Android setup, redeem-code activation, hosted OCR, translation processing, source-discovery support, and customer support. It does not sell or host manga chapters.',
  },
] as const;

const takedownSteps = [
  'Send the request to support with the work title, affected Nayovi URL or feature, your rights-holder relationship, and a reliable contact address.',
  'Include enough detail for the support team to identify the reported material or workflow output without exposing unrelated private files.',
  'Nayovi can remove public references, disable hosted processing where appropriate, preserve abuse evidence, and cooperate with lawful requests.',
  'Good-faith correction requests are welcome for attribution, terminology, source labeling, and policy wording.',
] as const;

interface SetupGuideCopy {
  description: string;
  eyebrow: string;
  firstRunIntro: string;
  title: string;
}

const mihonNayoviSetupGuideCopy: SetupGuideCopy = {
  description:
    'Set up Nayovi as a hosted OCR and translation workflow for Mihon, Tachiyomi, and TachiyomiAT-style Android readers without turning the project into a chapter source, extension list, or piracy index.',
  eyebrow: 'Setup guide',
  firstRunIntro:
    'This sequence keeps installation, activation, and policy checks clear before any translation job is processed.',
  title: 'Mihon, TachiyomiAT and Nayovi setup guide',
};

const mihonTachiyomiAtSetupGuideCopy: SetupGuideCopy = {
  description:
    'Use this setup guide if you searched for Mihon, TachiyomiAT, or Tachiyomi. Nayovi is the current branded Android APK and hosted OCR translation workflow.',
  eyebrow: 'TachiyomiAT setup',
  firstRunIntro:
    'This sequence maps older Mihon, Tachiyomi, and TachiyomiAT setup intent to the current Nayovi Android APK and hosted translation flow.',
  title: 'Mihon and TachiyomiAT setup guide',
};

export const PageMihonNayoviSetupGuide = () => {
  return <SetupGuidePage copy={mihonNayoviSetupGuideCopy} />;
};

export const PageMihonTachiyomiAtSetupGuide = () => {
  return <SetupGuidePage copy={mihonTachiyomiAtSetupGuideCopy} />;
};

const SetupGuidePage = (props: { copy: SetupGuideCopy }) => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow={props.copy.eyebrow}
        title={props.copy.title}
        description={props.copy.description}
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
        eyebrow="Reader lineage"
        title="TachiyomiAT, Tachiyomi and Mihon context"
        description="The public pages keep familiar reader search language visible while pointing readers to the current Nayovi app and support workflow."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {readerLineageNotes.map((item) => (
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
        eyebrow="Safe setup"
        title="Recommended first run"
        description={props.copy.firstRunIntro}
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Download Nayovi from the official APK link on this site. This is
              the current app path for readers arriving from TachiyomiAT,
              Tachiyomi, or Mihon searches.
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
        eyebrow="OCR checklist"
        title="Manhwa OCR review before translation"
        description="Use this checklist when a reviewer, directory editor, or partner needs a concrete way to evaluate Nayovi output on approved samples."
      >
        <Card className="rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-muted-foreground md:p-6">
            {ocrChecklistRows.map((row) => (
              <div
                key={row.checkpoint}
                className="grid gap-1 rounded-xl border border-border/70 px-4 py-3 md:grid-cols-[12rem_1fr] md:gap-4"
              >
                <span className="font-semibold text-foreground">
                  {row.checkpoint}
                </span>
                <span>{row.detail}</span>
              </div>
            ))}
          </CardContent>
        </Card>
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
            href="/guides/mihon-nayovi-setup"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Setup guide
          </a>
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageManhwaOcrGlossaryChecklist = () => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow="OCR checklist"
        title="Manhwa OCR glossary checklist"
        description="A reviewer-ready checklist for approved manhwa samples before Nayovi output is cited, shared with partners, or used to judge paid translation fit."
        className="pt-10"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {glossaryChecklistRows.map((row) => (
            <Card key={row.checkpoint} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{row.checkpoint}</CardTitle>
                <CardDescription>{row.reviewerQuestion}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-muted-foreground">
                {row.partnerSignal}
              </CardContent>
            </Card>
          ))}
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Partner use"
        title="Use it before review codes or pilots"
        description="The checklist gives Android reviewers, manga communities, localization teams, and creator platforms a shared quality bar for permission-safe tests."
      >
        <Card className="public-brand-panel-muted rounded-[1.5rem]">
          <CardContent className="grid gap-3 p-5 text-sm leading-7 text-brand-950 md:p-6 dark:text-brand-100">
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Start with owned, public-domain, official-sample, or
              permission-approved pages so the review stays safe to discuss.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Record terminology decisions before expanding a test to more
              pages, reviewers, affiliates, or community members.
            </div>
            <div className="rounded-xl border border-border/70 bg-background/45 px-4 py-3">
              Measure qualified installs, review-code activation, support
              questions, and repeat token-plan intent after the sample quality
              is clear.
            </div>
          </CardContent>
        </Card>
      </PublicSection>

      <PublicSection
        eyebrow="Next"
        title="Continue to the full workflow"
        description="Use the broader workflow page when a reviewer, directory, or partner needs setup, permission boundaries, and takedown-ready handling."
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
            href="/translate-manhwa-ai"
            className={buttonVariants({ variant: 'secondary', size: 'lg' })}
          >
            Manhwa AI page
          </a>
          <a
            href="/#contact"
            className={buttonVariants({ variant: 'ghost', size: 'lg' })}
          >
            Request review code
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
        description="Nayovi is for hosted OCR, translation support, activation, and troubleshooting. It does not host manga chapters or promote unauthorized chapter access."
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
        description="Rights holders, creators, publishers, and authorized representatives can request review when they believe Nayovi public pages, hosted processing, or support material involves unauthorized content."
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
        description="Use this page when explaining Nayovi to directories, moderators, contributors, or reviewers who need to verify the project is a tool, not a chapter-hosting site."
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
