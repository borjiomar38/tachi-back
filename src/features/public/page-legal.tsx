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
              This page is effective as of {legalEffectiveDate}. Contact
              support if you need a copy of a previous policy.
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
      title="Privacy Policy"
      description="This policy explains what Tachiyomi Back processes for hosted OCR, translation, source discovery, checkout, activation, and support."
      sections={[
        {
          title: 'Data we process',
          children: (
            <>
              <p>
                Tachiyomi Back processes the data needed to provide hosted OCR,
                translation, source discovery, licensing, token accounting,
                support, and app-update checks for TachiyomiAT.
              </p>
              <p>
                This can include uploaded pages or screenshots, extracted OCR
                text, translation prompts and outputs, source-discovery search
                terms, candidate results, chapter metadata, device identifiers,
                app version, locale, IP-derived request metadata, token ledger
                events, redeem-code activity, and support messages.
              </p>
            </>
          ),
        },
        {
          title: 'Payments',
          children: (
            <>
              <p>
                Paid plans are processed through Lemon Squeezy. Lemon Squeezy
                handles checkout, payment collection, taxes, payment compliance,
                refunds, and chargebacks as merchant of record. Tachiyomi Back
                does not store full card numbers.
              </p>
              <p>
                We store the payment and subscription records needed to match a
                paid invoice to a redeem code, token credit, device activation,
                customer support request, or refund review.
              </p>
            </>
          ),
        },
        {
          title: 'Content and copyright compliance',
          children: (
            <>
              <p>
                You must not upload, OCR, translate, store, or process manga,
                manhwa, manhua, chapters, scans, images, text, or other content
                unless you own the rights or have permission from the rights
                holder.
              </p>
              <p>
                If we detect or receive a credible report of copyright
                infringement, we may delete related jobs, suspend or revoke
                access, preserve abuse evidence, report the matter to rights
                holders, hosting providers, payment providers, or law
                enforcement, and cooperate with lawful requests.
              </p>
            </>
          ),
        },
        {
          title: 'Retention, deletion, and support',
          children: (
            <>
              <p>
                Raw uploads, OCR artifacts, translation outputs, and source
                discovery payloads are kept only as long as needed to deliver
                the requested service, debug failures, prevent abuse, or comply
                with legal and accounting obligations.
              </p>
              <p>
                Billing, token ledger, license, refund, security, and abuse
                records can be retained longer because they are needed for
                accounting, fraud prevention, dispute handling, and legal
                compliance. To request deletion or review of personal data,
                contact support from the Support page.
              </p>
            </>
          ),
        },
        {
          title: 'Third-party sources and processors',
          children: (
            <>
              <p>
                TachiyomiAT can open or search third-party manga sources and
                extensions. Those websites, extensions, and payment providers
                have their own terms and privacy policies. We are not
                responsible for their content, availability, or data handling.
              </p>
              <p>
                We use service providers for hosting, storage, logging, email,
                checkout, and AI processing. They receive only the data needed
                to perform their service.
              </p>
            </>
          ),
        },
        {
          title: 'Security and age limit',
          children: (
            <>
              <p>
                We use operational safeguards such as authentication, signed
                webhooks, rate limits, token accounting, and device-bound
                sessions to protect the service. No internet service can be
                guaranteed to be perfectly secure.
              </p>
              <p>
                Tachiyomi Back is not intended for children under 13. Do not use
                the service if you are not old enough to agree to these terms in
                your country.
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
      title="Terms of Service"
      description="These terms define the rules for Tachiyomi Back, TachiyomiAT hosted features, token plans, redeem codes, source discovery, OCR, and translation."
      sections={[
        {
          title: 'Service boundary',
          children: (
            <>
              <p>
                Tachiyomi Back sells token-based hosted processing for
                TachiyomiAT features such as OCR, translation, manga page
                translation, source discovery, and related support tooling. We
                do not sell manga, manhwa, manhua, chapters, scans, or access to
                third-party content.
              </p>
              <p>
                Source discovery and extension results are best-effort tools.
                We do not guarantee that a third-party source is correct,
                available, complete, safe, legal in your region, or up to date.
              </p>
            </>
          ),
        },
        {
          title: 'Payments, tokens, and activation',
          children: (
            <>
              <p>
                Plans are sold through Lemon Squeezy checkout. Monthly token
                crediting, redeem-code delivery, and device activation are
                finalized only after the backend receives and validates the paid
                invoice webhook.
              </p>
              <p>
                Tokens are usage credits for hosted processing. Token cost can
                vary by feature, page count, text amount, verification size, and
                model cost. Unused tokens, refunds, chargebacks, and manual
                adjustments are handled through support unless a checkout
                provider policy says otherwise.
              </p>
            </>
          ),
        },
        {
          title: 'Redeem codes and devices',
          children: (
            <>
              <p>
                Access is activated through redeem codes and device-bound
                sessions instead of a traditional customer account. You are
                responsible for keeping redeem codes private and using them only
                as intended by the plan.
              </p>
              <p>
                We may revoke or rotate redeem codes, reset device bindings, or
                suspend access when needed for support, payment disputes,
                security, abuse prevention, or legal compliance.
              </p>
            </>
          ),
        },
        {
          title: 'Copyright and prohibited use',
          children: (
            <>
              <p>
                You must not use Tachiyomi Back or TachiyomiAT hosted features
                to upload, OCR, translate, store, distribute, or process
                copyrighted manga, manhwa, manhua, chapters, scans, images,
                text, or other protected content unless you own the rights or
                have explicit permission from the rights holder.
              </p>
              <p>
                Copyright infringement, piracy, scraping abuse, credential
                abuse, bypassing access controls, harassment, illegal content,
                malware, automated abuse, or attempts to resell or share access
                outside the plan rules are prohibited.
              </p>
              <p>
                Violations can lead to immediate suspension, token forfeiture,
                deletion of jobs, permanent revocation of redeem codes, refusal
                of refunds where allowed by law, reporting to rights holders,
                hosting providers, payment providers, or law enforcement, and
                cooperation with lawful investigations.
              </p>
            </>
          ),
        },
        {
          title: 'Updates and availability',
          children: (
            <>
              <p>
                Some TachiyomiAT versions can be blocked by a forced-update
                policy when a newer build is required for security,
                compatibility, payment, licensing, or hosted processing
                correctness.
              </p>
              <p>
                The service may be unavailable because of maintenance, provider
                outages, source blocking, third-party website changes, network
                issues, rate limits, Cloudflare protections, model failures, or
                other operational problems.
              </p>
            </>
          ),
        },
        {
          title: 'Support and changes',
          children: (
            <>
              <p>
                Contact support for billing questions, redeem-code recovery,
                device recovery, refund review, privacy requests, copyright
                complaints, or abuse reports.
              </p>
              <p>
                We may update these terms as the product changes. Continued use
                after an update means you accept the updated terms.
              </p>
            </>
          ),
        },
      ]}
    />
  );
};
