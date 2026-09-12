import type { PublicTokenPack } from '@/features/public/data';

interface TokenPackAction {
  href: string;
  labelKey: 'tokens:trial' | 'tokens:choose' | 'tokens:support';
}

export const resolveTokenPackAction = (
  tokenPack: PublicTokenPack
): TokenPackAction => {
  if (tokenPack.key === 'free') {
    return { href: '/download', labelKey: 'tokens:trial' };
  }
  if (!tokenPack.checkoutEnabled) {
    return { href: '/support', labelKey: 'tokens:support' };
  }
  return { href: `/checkout/${tokenPack.key}`, labelKey: 'tokens:choose' };
};
