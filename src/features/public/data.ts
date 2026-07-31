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

export const PUBLIC_SUPPORT_EMAIL = "contact@nayovi.com";
export const PUBLIC_OWNER_WHATSAPP_DISPLAY = "+216 23 655 086";
export const PUBLIC_OWNER_WHATSAPP_HREF =
  "https://wa.me/21623655086?text=Hello%20Nayovi%2C%20I%20need%20help%20with%20the%20app.";

export const publicFreeTokenPack: PublicTokenPack = {
  id: "public-free",
  key: "free",
  name: "Free trial",
  description:
    "One-time free trial for testing Nayovi—about two average chapters, depending on chapter length.",
  tokenAmount: 25,
  bonusTokenAmount: 0,
  priceAmountCents: 0,
  currency: "USD",
  totalTokens: 25,
  checkoutEnabled: false,
  estimatedPages: 40,
  estimatedChapters: 2,
  marketingSummary: "About 2 chapters included",
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
    id: "fallback-starter",
    key: "starter",
    name: "Starter 50",
    description:
      "Good for trying hosted manga, manhwa, and manhua AI translation.",
    tokenAmount: 500,
    bonusTokenAmount: 0,
    priceAmountCents: 200,
    currency: "USD",
    totalTokens: 500,
    checkoutEnabled: false,
    estimatedPages: 1_000,
    estimatedChapters: 50,
    marketingSummary: "Good to start",
    marketedChaptersPerMonth: 50,
  },
  {
    id: "fallback-pro",
    key: "pro",
    name: "Pro 250",
    description: "Best for regular manga, manhwa, and manhua AI translation.",
    tokenAmount: 2500,
    bonusTokenAmount: 0,
    priceAmountCents: 1000,
    currency: "USD",
    totalTokens: 2500,
    checkoutEnabled: false,
    estimatedPages: 5_000,
    estimatedChapters: 250,
    marketingSummary: "Best for regular readers",
    marketedChaptersPerMonth: 250,
  },
  {
    id: "fallback-power",
    key: "power",
    name: "Power 550",
    description:
      "For heavy readers who translate manhwa, manga, and manhua often.",
    tokenAmount: 5500,
    bonusTokenAmount: 0,
    priceAmountCents: 2000,
    currency: "USD",
    totalTokens: 5500,
    checkoutEnabled: false,
    estimatedPages: 11_000,
    estimatedChapters: 550,
    marketingSummary: "For heavy readers",
    marketedChaptersPerMonth: 550,
  },
];

export const publicHighlights: ContentBlock[] = [
  {
    title: "Keep reading without switching apps",
    description:
      "Translate the chapter inside Nayovi, then continue reading in the same Android app.",
  },
  {
    title: "Works with manhwa, manga, and manhua",
    description:
      "Use one simple reading flow for Japanese manga, Korean manhwa, and Chinese manhua.",
  },
  {
    title: "Built for Android readers",
    description:
      "Download the Nayovi APK, open a chapter, and choose the language you want to read.",
  },
];

export const activationSteps: ContentBlock[] = [
  {
    title: "1. Install Nayovi",
    description:
      "Download the official APK and install it on your Android phone.",
  },
  {
    title: "2. Open a chapter",
    description:
      "Choose the manhwa, manga, or manhua chapter you want to read.",
  },
  {
    title: "3. Choose your language",
    description:
      "Start the translation and keep reading the chapter directly in Nayovi.",
  },
];

export const supportFaqs: ContentBlock[] = [
  {
    title: "What is Nayovi?",
    description:
      "Nayovi is a manhwa, manga, and manhua translator for Android. It keeps the familiar reading flow of TachiyomiAT, Tachiyomi, and Mihon-style apps while adding full-chapter translation.",
  },
  {
    title: "Can I try Nayovi for free?",
    description:
      "Yes. The one-time free trial includes about two average chapters. The exact amount can vary with chapter length, and no card is required.",
  },
  {
    title: "What can I read with it?",
    description:
      "Nayovi can translate manga, manhwa, and manhua chapters that you are allowed to process, including content you own, public-domain pages, and approved samples.",
  },
  {
    title: "Is setup difficult?",
    description:
      "No. Install the Android APK, open a chapter, and choose your language. Nayovi handles the translation flow for you.",
  },
  {
    title: "Which monthly plan should I choose?",
    description:
      "Starter is for occasional reading, Pro is for regular readers, and Power is for heavier use. Start free and upgrade only if you keep using Nayovi.",
  },
  {
    title: "What happens after I pay?",
    description:
      "Your receipt and activation instructions are sent to the email used at checkout. Follow those instructions once in Nayovi to start using the plan.",
  },
  {
    title: "How do I cancel a monthly plan?",
    description:
      "Use the billing link in your checkout receipt. Monthly plans renew until they are cancelled.",
  },
  {
    title: "Does unused monthly allowance roll over?",
    description:
      "No. Your chapter allowance resets when the monthly plan renews, so choose the plan closest to how much you normally read.",
  },
];

export const legalEffectiveDate = "July 31, 2026";

export const formatTokenCount = (value: number) =>
  new Intl.NumberFormat("en-US").format(value);

export const formatCurrency = (priceAmountCents: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(priceAmountCents / 100);
