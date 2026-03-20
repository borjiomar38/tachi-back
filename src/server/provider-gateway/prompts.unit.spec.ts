import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env/server', () => ({
  envServer: {
    TRANSLATION_PROMPT_VERSION: '2026-03-20.v1',
  },
}));

import {
  buildTranslationJsonPayload,
  buildTranslationPrompt,
  selectPromptProfile,
} from '@/server/provider-gateway/prompts';

describe('provider gateway prompts', () => {
  it('selects a language-aware manga prompt profile', () => {
    expect(
      selectPromptProfile({
        sourceLanguage: 'ja',
        targetLanguage: 'en',
      })
    ).toBe('japanese_to_english');

    expect(
      selectPromptProfile({
        sourceLanguage: 'fr',
        targetLanguage: 'ar',
      })
    ).toBe('arabic_target');
  });

  it('builds a stable JSON payload keyed by page filename', () => {
    expect(
      buildTranslationJsonPayload([
        {
          blocks: [{ text: '안녕' }, { text: '하세요' }],
          pageKey: '001.jpg',
        },
      ])
    ).toEqual({
      '001.jpg': ['안녕', '하세요'],
    });
  });

  it('builds a prompt bundle with compacted context and version metadata', () => {
    const prompt = buildTranslationPrompt({
      mangaContext: 'Chapter recap\nHero meets rival',
      pages: [
        {
          blocks: [{ text: 'こんにちは' }],
          pageKey: '001.jpg',
        },
      ],
      sourceLanguage: 'ja',
      targetLanguage: 'en',
    });

    expect(prompt.promptProfile).toBe('japanese_to_english');
    expect(prompt.promptVersion).toBe('2026-03-20.v1');
    expect(prompt.systemPrompt).toContain('Return only valid JSON');
    expect(prompt.userPrompt).toContain('Chapter recap');
    expect(prompt.userPrompt).toContain('"001.jpg":["こんにちは"]');
  });
});
