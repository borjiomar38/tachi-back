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

  it('builds a compact stable JSON payload keyed by temporary block id', () => {
    expect(
      buildTranslationJsonPayload([
        {
          blocks: [{ text: '안녕' }, { text: '하세요' }],
          pageKey: '001.jpg',
        },
      ])
    ).toEqual({
      b000000: '안녕',
      b000001: '하세요',
    });
  });

  it('normalizes OCR line breaks and omits visual layout metadata', () => {
    expect(
      buildTranslationJsonPayload([
        {
          blocks: [
            {
              angle: 0,
              height: 40,
              symHeight: 18,
              symWidth: 10,
              text: 'WAS THAT\nLIGHTNING',
              width: 120,
              x: 25,
              y: 50,
            },
          ],
          pageKey: '001.jpg',
        },
      ])
    ).toEqual({
      b000000: 'WAS THAT LIGHTNING',
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
    expect(prompt.systemPrompt).toContain('temporary block ids');
    expect(prompt.systemPrompt).toContain(
      'Do not preserve, copy, or recreate OCR line breaks'
    );
    expect(prompt.userPrompt).toContain('Chapter recap');
    expect(prompt.userPrompt).toContain('"b000000":"こんにちは"');
    expect(prompt.userPrompt).not.toContain('"001.jpg"');
    expect(prompt.userPrompt).not.toContain('"sourceHash"');
    expect(prompt.userPrompt).not.toContain('"layout"');
  });

  it('uses elevated literary scanlation guidance for Arabic targets', () => {
    const prompt = buildTranslationPrompt({
      pages: [
        {
          blocks: [{ text: 'I have planted the seed of doubt.' }],
          pageKey: '001.jpg',
        },
      ],
      sourceLanguage: 'en',
      targetLanguage: 'ar',
    });

    expect(prompt.promptProfile).toBe('arabic_target');
    expect(prompt.systemPrompt).toContain('فصحى جزلة');
    expect(prompt.systemPrompt).toContain('almost poetic');
    expect(prompt.systemPrompt).toContain('Arabic scanlation bubbles');
    expect(prompt.systemPrompt).toContain('العظمة، الهيبة، القدر');
  });
});
