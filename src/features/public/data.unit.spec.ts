import { describe, expect, it } from 'vitest';

import { buildPublicFreeTokenPack } from '@/features/public/data';

describe('buildPublicFreeTokenPack', () => {
  it('uses the configured trial allowance', () => {
    expect(buildPublicFreeTokenPack(40)).toMatchObject({
      estimatedChapters: 4,
      estimatedPages: 80,
      tokenAmount: 40,
      totalTokens: 40,
    });
  });

  it('keeps the default 25-token offer coherent', () => {
    expect(buildPublicFreeTokenPack(25)).toMatchObject({
      estimatedChapters: 2,
      estimatedPages: 40,
      tokenAmount: 25,
      totalTokens: 25,
    });
  });
});
