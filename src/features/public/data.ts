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

export const PUBLIC_SUPPORT_EMAIL = 'borjiomar38@gmail.com';
export const PUBLIC_OWNER_WHATSAPP_DISPLAY = '+216 23 655 086';
export const PUBLIC_OWNER_WHATSAPP_HREF =
  'https://wa.me/21623655086?text=Hello%20TachiyomiAT%2C%20I%20need%20help%20with%20the%20app.';

export const publicFreeTokenPack: PublicTokenPack = {
  id: 'public-free',
  key: 'free',
  name: 'Free 10',
  description: 'Free monthly access for trying manga and manhwa translation.',
  tokenAmount: 100,
  bonusTokenAmount: 0,
  priceAmountCents: 0,
  currency: 'USD',
  totalTokens: 100,
  checkoutEnabled: false,
  estimatedPages: 200,
  estimatedChapters: 10,
  marketingSummary: 'Free trial access',
  marketedChaptersPerMonth: 10,
};

export const fallbackPublicTokenPacks: PublicTokenPack[] = [
  publicFreeTokenPack,
  {
    id: 'fallback-starter',
    key: 'starter',
    name: 'Starter 50',
    description: 'Good for trying hosted manga and manhwa translation.',
    tokenAmount: 500,
    bonusTokenAmount: 0,
    priceAmountCents: 200,
    currency: 'USD',
    totalTokens: 500,
    checkoutEnabled: false,
    estimatedPages: 1_000,
    estimatedChapters: 50,
    marketingSummary: 'Good to start',
    marketedChaptersPerMonth: 50,
  },
  {
    id: 'fallback-pro',
    key: 'pro',
    name: 'Pro 250',
    description: 'Best for regular manga and manhwa reading.',
    tokenAmount: 2500,
    bonusTokenAmount: 0,
    priceAmountCents: 1000,
    currency: 'USD',
    totalTokens: 2500,
    checkoutEnabled: false,
    estimatedPages: 5_000,
    estimatedChapters: 250,
    marketingSummary: 'Best for regular readers',
    marketedChaptersPerMonth: 250,
  },
  {
    id: 'fallback-power',
    key: 'power',
    name: 'Power 550',
    description: 'For heavy readers who translate often.',
    tokenAmount: 5500,
    bonusTokenAmount: 0,
    priceAmountCents: 2000,
    currency: 'USD',
    totalTokens: 5500,
    checkoutEnabled: false,
    estimatedPages: 11_000,
    estimatedChapters: 550,
    marketingSummary: 'For heavy readers',
    marketedChaptersPerMonth: 550,
  },
];

export const publicHighlights: ContentBlock[] = [
  {
    title: 'Manga translate IA fast',
    description:
      'Open a chapter, launch AI translation, and keep reading without complex setup.',
  },
  {
    title: 'Manhwa translate IA workflow',
    description:
      'Text is detected cleanly on vertical manhwa pages, even when the layout is busy.',
  },
  {
    title: 'Manhua translate IA support',
    description:
      'Keep names, realms, and recurring terms consistent while reading manhua.',
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
      'Only translate content you own, content in the public domain, or content you have permission to process.',
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

export const legalEffectiveDate = 'April 27, 2026';

export const formatTokenCount = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

export const formatCurrency = (priceAmountCents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceAmountCents / 100);
