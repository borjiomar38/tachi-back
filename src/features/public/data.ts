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

export const PUBLIC_SUPPORT_EMAIL = 'support@nayovi.com';
export const PUBLIC_OWNER_WHATSAPP_DISPLAY = '+216 23 655 086';
export const PUBLIC_OWNER_WHATSAPP_HREF =
  'https://wa.me/21623655086?text=Hello%20Nayovi%2C%20I%20need%20help%20with%20the%20app.';

export const publicFreeTokenPack: PublicTokenPack = {
  id: 'public-free',
  key: 'free',
  name: 'Free trial',
  description:
    'Free trial access for trying manga, manhwa, and manhua AI translation, limited to two chapters per day.',
  tokenAmount: 25,
  bonusTokenAmount: 0,
  priceAmountCents: 0,
  currency: 'USD',
  totalTokens: 25,
  checkoutEnabled: false,
  estimatedPages: 40,
  estimatedChapters: 2,
  marketingSummary: 'Free trial access',
  marketedChaptersPerMonth: 2,
};

export function buildPublicFreeTokenPack(tokenAmount: number): PublicTokenPack {
  const safeTokenAmount = Math.max(1, Math.floor(tokenAmount));
  const estimatedChapters = Math.max(1, Math.floor(safeTokenAmount / 10));

  return {
    ...publicFreeTokenPack,
    estimatedChapters,
    estimatedPages: estimatedChapters * 20,
    marketedChaptersPerMonth: estimatedChapters,
    tokenAmount: safeTokenAmount,
    totalTokens: safeTokenAmount,
  };
}

export const fallbackPublicTokenPacks: PublicTokenPack[] = [
  publicFreeTokenPack,
  {
    id: 'fallback-starter',
    key: 'starter',
    name: 'Starter 50',
    description:
      'Good for trying hosted manga, manhwa, and manhua AI translation.',
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
    description: 'Best for regular manga, manhwa, and manhua AI translation.',
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
    description: 'For heavy readers who use manga translate AI often.',
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
    title: 'Free manga AI translator',
    description:
      'Open a chapter, launch AI translation, and move from the free trial to monthly token plans only when hosted OCR + translation proves useful.',
  },
  {
    title: 'Free manhwa AI translator',
    description:
      'Text is detected cleanly on vertical manhwa pages, then you can scale to monthly token plans for repeat weekly reading.',
  },
  {
    title: 'Free manhua AI translator',
    description:
      'Keep names, realms, and recurring terms consistent while reading manhua, with a clear path to paid recurring access when usage repeats.',
  },
  {
    title: 'Easy activation',
    description:
      'No technical account setup. Install the APK, add your redeem code, and upgrade to a monthly plan when trial volume turns recurring.',
  },
];

export const activationSteps: ContentBlock[] = [
  {
    title: '1. Pick a monthly plan',
    description:
      'Choose the free or monthly plan that matches how much manga, manhwa, or manhua you translate every month.',
  },
  {
    title: '2. Receive a redeem code',
    description:
      'After payment, you receive your redeem code by email.',
  },
  {
    title: '3. Add the code in the app',
    description:
      'Enter the redeem code in Nayovi once to unlock your monthly plan.',
  },
  {
    title: '4. Start translating chapters',
    description:
      'Pick a chapter and launch manga translate AI, manhwa translate AI, or manhua translate AI when you need it in the Nayovi app.',
  },
];

export const supportFaqs: ContentBlock[] = [
  {
    title: 'Is Nayovi related to TachiyomiAT, Tachiyomi, or Mihon?',
    description:
      'Nayovi keeps the Android reader workflow familiar for people searching TachiyomiAT, Tachiyomi, or Mihon, while focusing on hosted OCR, AI translation, activation, and support.',
  },
  {
    title: 'What can I translate?',
    description:
      'Use manga translate AI, manhwa translate AI, or manhua translate AI only with content you own, content in the public domain, or content you have permission to process.',
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
      'Yes. You can use one redeem code across approved devices or a small reading group, agency, creator team, or review test. Choose a plan that matches the total monthly usage.',
  },
  {
    title: 'Can I get more tokens?',
    description:
      'Yes. If your monthly tokens run out, ask support for an additional redeem code.',
  },
  {
    title: 'How do I cancel a monthly plan?',
    description:
      'Use the billing link from your checkout receipt or contact support with the receipt email so the subscription can be located and cancellation guidance can be sent.',
  },
  {
    title: 'What should I send for refund or billing help?',
    description:
      'Send the checkout receipt email, redeem code, and a short description of the issue so support can review payment status, token delivery, and recent activation attempts.',
  },
  {
    title: 'Which plan should I choose?',
    description:
      'Starter is good for trying the service, Pro is best for regular reading, and Power is for heavy readers.',
  },
  {
    title: 'When should I switch to paid plans?',
    description:
      'Upgrade when one or more readers consistently translate multiple chapters per week; trial access is the test phase before recurring monthly tokens.',
  },
  {
    title: 'When should I upgrade from the free trial?',
    description:
      'Upgrade when you translate regularly, need more monthly chapters, or want a redeem code that can support several devices or readers.',
  },
  {
    title: 'Can a reading group, agency, or creator team use one plan?',
    description:
      'Yes. Pick the monthly token plan that matches the group volume, share the redeem code with approved users, and contact support if you need a custom monthly limit.',
  },
  {
    title: 'Which plan is best for affiliates or community demos?',
    description:
      'Start with Pro if you need enough monthly chapters for repeat demos, reviews, or a small community test. Ask support for a dedicated code before publishing a public walkthrough.',
  },
  {
    title: 'Can reviewers or partners get a test code?',
    description:
      'Yes. Reviewers, affiliates, community moderators, and publisher or platform teams can contact support for a scoped test code before publishing a walkthrough or partnership note.',
  },
  {
    title: 'Can publishers or platforms request a private workflow review?',
    description:
      'Yes. Publisher, platform, and creator teams can ask support for a private review of approved-sample translation, glossary handling, hosted processing, and takedown-ready support before any public collaboration.',
  },
  {
    title: 'Where should business or investor questions go?',
    description:
      'Use the support email with the subject line "Nayovi business inquiry" and include whether the request is about partnerships, affiliate tests, publisher workflows, or investor due diligence.',
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
