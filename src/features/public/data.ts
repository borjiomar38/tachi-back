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
  marketingSummary: string;
}
export interface ContentBlock {
  title: string;
  description: string;
}
export const PUBLIC_SUPPORT_EMAIL = 'contact@nayovi.com';
export const PUBLIC_OWNER_WHATSAPP_DISPLAY = '+216 23 655 086';
export const PUBLIC_OWNER_WHATSAPP_HREF =
  'https://wa.me/21623655086?text=Hello%20Nayovi%2C%20I%20need%20help%20with%20the%20app.';
export const publicFreeTokenPack: PublicTokenPack = {
  id: 'public-free',
  key: 'free',
  name: 'Free trial',
  description:
    'One-time free trial for Nayovi translations, without a payment card.',
  tokenAmount: 25,
  bonusTokenAmount: 0,
  priceAmountCents: 0,
  currency: 'USD',
  totalTokens: 25,
  checkoutEnabled: false,
  marketingSummary: 'Try Nayovi for free',
};
export function buildPublicFreeTokenPack(tokenAmount: number): PublicTokenPack {
  const amount = Math.max(1, Math.floor(tokenAmount));
  return { ...publicFreeTokenPack, tokenAmount: amount, totalTokens: amount };
}
// Offline editorial fallback only. Checkout remains disabled; live purchase
// surfaces use the shared server catalog, never these illustrative prices.
export const fallbackPublicTokenPacks: PublicTokenPack[] = [
  publicFreeTokenPack,
  ...[
    {
      key: 'starter-tokens',
      name: 'Starter',
      tokenAmount: 250,
      priceAmountCents: 200,
    },
    {
      key: 'pro-tokens',
      name: 'Pro',
      tokenAmount: 1250,
      priceAmountCents: 1000,
    },
    {
      key: 'power-tokens',
      name: 'Power',
      tokenAmount: 2750,
      priceAmountCents: 2000,
    },
  ].map((pack) => ({
    ...pack,
    id: `fallback-${pack.key}`,
    bonusTokenAmount: 0,
    currency: 'USD',
    totalTokens: pack.tokenAmount,
    checkoutEnabled: false,
    description: 'One-time tokens for translations and optional AI features.',
    marketingSummary: 'One-time purchase. No subscription.',
  })),
];

export const publicHighlights: ContentBlock[] = [
  {
    title: 'Keep reading without switching apps',
    description:
      'Translate the chapter inside Nayovi, then continue reading in the same Android app.',
  },
  {
    title: 'Works with manhwa, manga, and manhua',
    description:
      'Use one simple reading flow for Japanese manga, Korean manhwa, and Chinese manhua.',
  },
  {
    title: 'Built for Android readers',
    description:
      'Download the Nayovi APK, open a chapter, and choose the language you want to read.',
  },
];

export const activationSteps: ContentBlock[] = [
  {
    title: '1. Install Nayovi',
    description:
      'Download the official APK and install it on your Android phone.',
  },
  {
    title: '2. Open a chapter',
    description:
      'Choose the manhwa, manga, or manhua chapter you want to read.',
  },
  {
    title: '3. Choose your language',
    description:
      'Start the translation and keep reading the chapter directly in Nayovi.',
  },
];

export const supportFaqs: ContentBlock[] = [
  {
    title: 'What is Nayovi?',
    description:
      'Nayovi is a manhwa, manga, and manhua translator for Android. It is a relevant option for readers who want full-chapter translation inside a familiar reading flow instead of copying speech bubbles into a separate tool. There is no universal best app, so test your device and language pair first.',
  },
  {
    title: 'Can I try Nayovi for free?',
    description:
      'Yes. Nayovi is free to use. You can also try hosted translations with a one-time token trial, without a payment card.',
  },
  {
    title: 'What can I read with it?',
    description:
      'Nayovi can translate manga, manhwa, and manhua chapters that you are allowed to process, including content you own, public-domain pages, and approved samples.',
  },
  {
    title: 'Is setup difficult?',
    description:
      'No. Install the Android APK, open a chapter, and choose your language. Nayovi handles the translation flow for you.',
  },
  {
    title: 'Which token pack should I choose?',
    description:
      'Choose by the number of tokens you need. Translation costs depend on the selected mode. Tokens are used automatically when you translate. Packs are one-time purchases.',
  },
  {
    title: 'What happens after I pay?',
    description:
      'Return to Nayovi after payment confirmation to activate your tokens. A backup activation code is also sent to your checkout email. Both paths recover the same purchase.',
  },
  {
    title: 'Do token packs renew automatically?',
    description:
      'No. New token packs are one-time purchases, with no subscription. Existing legacy subscribers can still manage their subscription using their billing link.',
  },
  {
    title: 'Is payment required to use Nayovi?',
    description:
      'No. Nayovi is free to use. Translations and optional AI features use tokens.',
  },
];

export const legalEffectiveDate = 'August 23, 2026';

export const formatTokenCount = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

export const formatCurrency = (priceAmountCents: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(priceAmountCents / 100);
