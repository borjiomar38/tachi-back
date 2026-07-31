import { describe, expect, it } from "vitest";

import {
  buildPublicFreeTokenPack,
  publicFreeTokenPack,
} from "@/features/public/data";

describe("buildPublicFreeTokenPack", () => {
  it("uses the configured trial allowance", () => {
    expect(buildPublicFreeTokenPack(40)).toMatchObject({
      estimatedChapters: 4,
      estimatedPages: 80,
      tokenAmount: 40,
      totalTokens: 40,
    });
  });

  it("keeps the default 25-token offer coherent", () => {
    expect(buildPublicFreeTokenPack(25)).toMatchObject({
      estimatedChapters: 2,
      estimatedPages: 40,
      tokenAmount: 25,
      totalTokens: 25,
    });
  });

  it("describes the free allowance as a one-time trial", () => {
    expect(publicFreeTokenPack.description).toContain("One-time free trial");
    expect(publicFreeTokenPack.description).not.toMatch(/daily|per day/i);
  });
});
