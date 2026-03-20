import { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { legalEffectiveDate } from '@/features/public/data';
import { PublicSection, PublicShell } from '@/features/public/public-shell';

interface LegalSection {
  title: string;
  children: ReactNode;
}

const LegalPage = (props: {
  eyebrow: string;
  title: string;
  description: string;
  sections: LegalSection[];
}) => {
  return (
    <PublicShell>
      <PublicSection
        eyebrow={props.eyebrow}
        title={props.title}
        description={props.description}
        className="pt-10 pb-20"
      >
        <Card className="mb-6 rounded-[1.5rem]">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg">Effective date</CardTitle>
            <CardDescription>
              Placeholder legal copy dated {legalEffectiveDate}. Replace this
              with production policy text before launch.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4">
          {props.sections.map((section) => (
            <Card key={section.title} className="rounded-[1.5rem]">
              <CardHeader className="gap-2">
                <CardTitle className="text-lg">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                {section.children}
              </CardContent>
            </Card>
          ))}
        </div>
      </PublicSection>
    </PublicShell>
  );
};

export const PageLegalPrivacy = () => {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy placeholder"
      description="The hosted service will process images, OCR text, translation prompts, and result manifests, so privacy terms need to exist before launch."
      sections={[
        {
          title: 'Data handled by hosted mode',
          children: (
            <>
              <p>
                Hosted mode is expected to handle uploaded chapter pages,
                extracted OCR text, translation prompts, device identifiers,
                token-balance events, and support metadata.
              </p>
              <p>
                Before launch, this placeholder must be replaced with the real
                retention, processor, and deletion policies for those artifacts.
              </p>
            </>
          ),
        },
        {
          title: 'Retention and deletion',
          children: (
            <>
              <p>
                Raw images and intermediate artifacts should have short-lived
                retention windows, while accounting and audit records can retain
                longer operational metadata.
              </p>
              <p>
                This public page exists now so later phases have a stable place
                to document those rules clearly.
              </p>
            </>
          ),
        },
      ]}
    />
  );
};

export const PageLegalTerms = () => {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Service placeholder"
      description="The public website needs basic legal placeholders now so checkout, activation, and support flows have somewhere to point later."
      sections={[
        {
          title: 'Service boundary',
          children: (
            <>
              <p>
                The hosted service is intended to sell token-based OCR and
                translation processing for TachiyomiAT, not to sell content or
                manga access.
              </p>
              <p>
                Before launch, this page should define acceptable use, payment
                terms, refund boundaries, and service-availability language.
              </p>
            </>
          ),
        },
        {
          title: 'Account and activation model',
          children: (
            <>
              <p>
                The planned customer flow uses redeem codes and device binding
                instead of a normal user account, so the terms should document
                recovery, revocation, and misuse handling in those terms.
              </p>
            </>
          ),
        },
      ]}
    />
  );
};
