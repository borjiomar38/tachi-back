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
  estimatedPages: number;
  estimatedChapters: number;
  marketingSummary: string;
  marketedChaptersPerMonth: number;
}

export interface ContentBlock {
  title: string;
  description: string;
}

export const PUBLIC_SUPPORT_EMAIL = 'support@tachi-back.local';

export const publicHighlights: ContentBlock[] = [
  {
    title: 'Translate manga and manhwa fast',
    description:
      'Open a chapter, launch the translation, and keep reading without complex setup.',
  },
  {
    title: 'Powerful text detection',
    description:
      'Text is detected cleanly on manga and manhwa pages, even when the layout is busy.',
  },
  {
    title: 'Simple monthly plans',
    description:
      'Choose a monthly plan, receive your redeem code by email, and start using it in the app.',
  },
  {
    title: 'Easy activation',
    description:
      'No technical account setup. Just add your redeem code and start translating.',
  },
];

export const activationSteps: ContentBlock[] = [
  {
    title: '1. Pick a monthly plan',
    description:
      'Choose the plan that matches how much manga or manhwa you read every month.',
  },
  {
    title: '2. Receive a redeem code',
    description:
      'After payment, you receive your redeem code by email.',
  },
  {
    title: '3. Add the code in the app',
    description:
      'Enter the redeem code in TachiyomiAT once to unlock your monthly plan.',
  },
  {
    title: '4. Start translating chapters',
    description:
      'Pick a chapter and launch the translation when you need it.',
  },
];

export const supportFaqs: ContentBlock[] = [
  {
    title: 'What can I translate?',
    description:
      'You can use the service for manga and manhwa chapters inside TachiyomiAT.',
  },
  {
    title: 'Do I need API keys?',
    description:
      'No. The goal is a simple user flow: subscribe, receive a code, activate, and translate.',
  },
  {
    title: 'How do I get my redeem code?',
    description:
      'After payment, the redeem code is sent to your email address.',
  },
  {
    title: 'Can I share my redeem code?',
    description:
      'Yes. You can share a redeem code across devices or people.',
  },
  {
    title: 'Can I get more tokens?',
    description:
      'Yes. If your monthly tokens run out, ask support for an additional redeem code.',
  },
  {
    title: 'Which plan should I choose?',
    description:
      'Starter is good for trying the service, Pro is best for regular reading, and Power is for heavy readers.',
  },
  {
    title: 'Is it monthly?',
    description:
      'Yes. The plans renew every month until you cancel them.',
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
