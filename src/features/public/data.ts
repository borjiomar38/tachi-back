export interface PublicTokenPack {
  id: string;
  key: string;
  name: string;
  description: string | null;
  tokenAmount: number;
  bonusTokenAmount: number;
  priceAmountCents: number;
  currency: string;
  totalTokens: number;
  checkoutEnabled: boolean;
}

export interface ContentBlock {
  title: string;
  description: string;
}

export const PUBLIC_SUPPORT_EMAIL = 'support@tachi-back.local';

export const publicHighlights: ContentBlock[] = [
  {
    title: 'Server-side OCR and translation',
    description:
      'Provider calls move to the backend so API keys stay off the device and routing stays under your control.',
  },
  {
    title: 'Redeem-code activation',
    description:
      'Customers do not need a website account. They pay, receive a redeem code, and bind tokens to an app installation.',
  },
  {
    title: 'Token-based usage',
    description:
      'Token packs let you sell hosted usage cleanly while keeping provider cost accounting on the server side.',
  },
  {
    title: 'Backoffice support controls',
    description:
      'Internal staff can inspect devices, issue manual credits, and manage licenses without exposing internal tools to customers.',
  },
];

export const activationSteps: ContentBlock[] = [
  {
    title: '1. Pick a token pack',
    description:
      'Customers choose a starter, pro, or power pack from the public pricing page.',
  },
  {
    title: '2. Receive a redeem code',
    description:
      'Stripe checkout can start the purchase, but durable crediting and redeem-code creation only become final after webhook confirmation.',
  },
  {
    title: '3. Bind to an installation',
    description:
      'The app will redeem tokens against an installation identity instead of a normal user account.',
  },
  {
    title: '4. Spend tokens on hosted jobs',
    description:
      'OCR and translation jobs run on the backend while the app polls for results and keeps the existing reader output contract.',
  },
];

export const supportFaqs: ContentBlock[] = [
  {
    title: 'What do tokens pay for?',
    description:
      'Tokens are the hosted usage balance for OCR and translation jobs. The app will spend them when a chapter is processed through the backend.',
  },
  {
    title: 'Which providers will be supported?',
    description:
      'The backend roadmap currently targets Google Cloud Vision for OCR and Gemini, OpenAI, and Anthropic for translation, with provider routing kept server-side.',
  },
  {
    title: 'Will customers need an account?',
    description:
      'No. The planned hosted flow is redeem code plus device binding, not customer login through the web backoffice.',
  },
  {
    title: 'How do device changes work?',
    description:
      'Backoffice support will be able to inspect device bindings and handle manual recovery or revocation when a device is lost or replaced.',
  },
  {
    title: 'How will refunds work?',
    description:
      'Stripe checkout can collect payment in this phase, but refund automation, token ledger posting, and support tooling still land in later phases.',
  },
  {
    title: 'What about privacy?',
    description:
      'Hosted mode will process images and text on the backend, so retention limits, short-lived artifacts, and customer-facing privacy terms must be explicit before launch.',
  },
];

export const legalEffectiveDate = 'March 19, 2026';

export const formatTokenCount = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

export const formatCurrency = (priceAmountCents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceAmountCents / 100);
