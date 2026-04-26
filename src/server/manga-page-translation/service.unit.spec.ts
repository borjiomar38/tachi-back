import { describe, expect, it, vi } from 'vitest';

import { translateMangaPage } from './service';

describe('manga page translation service', () => {
  it('maps translated metadata and chapter names back to the mobile response shape', async () => {
    const translate = vi.fn().mockResolvedValue({
      pages: [
        {
          blocks: [
            {
              index: 0,
              sourceText: '全职觉醒',
              translation: 'Full-Time Awakening',
            },
            {
              index: 1,
              sourceText: '作为最强觉醒者的神之兵团的队长白以',
              translation: 'As the captain of the strongest awakened legion...',
            },
            { index: 2, sourceText: '动作', translation: 'Action' },
            { index: 3, sourceText: '第123话', translation: 'Chapter 123' },
            { index: 4, sourceText: '第122话', translation: 'Chapter 122' },
          ],
          pageKey: 'manga_page',
        },
      ],
      promptProfile: 'chinese_to_english',
      promptVersion: 'test',
      provider: 'openai',
      providerModel: 'test-model',
      sourceLanguage: 'zh',
      targetLanguage: 'en',
      usage: {
        latencyMs: 1,
        pageCount: 1,
        requestCount: 1,
      },
    });

    const result = await translateMangaPage(
      {
        chapters: [
          { key: '/123', name: '第123话', url: '/123' },
          { key: '/122', name: '第122话', url: '/122' },
        ],
        manga: {
          description: '作为最强觉醒者的神之兵团的队长白以',
          genres: ['动作'],
          title: '全职觉醒',
          url: '/manga/full-time-awakening',
        },
        sourceId: '1',
        sourceLanguage: 'zh',
        targetLanguage: 'en',
      },
      { translate }
    );

    expect(result).toEqual({
      chapters: [
        { key: '/123', name: 'Chapter 123' },
        { key: '/122', name: 'Chapter 122' },
      ],
      manga: {
        description: 'As the captain of the strongest awakened legion...',
        genres: ['Action'],
        title: 'Full-Time Awakening',
      },
      targetLanguage: 'en',
    });
    expect(translate).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: [
          {
            blocks: [
              { text: '全职觉醒' },
              { text: '作为最强觉醒者的神之兵团的队长白以' },
              { text: '动作' },
              { text: '第123话' },
              { text: '第122话' },
            ],
            pageKey: 'manga_page',
          },
        ],
      })
    );
  });

  it('keeps manga title and chapter labels in English for non-English page translations', async () => {
    const translate = vi.fn().mockImplementation((input) => {
      if (input.targetLanguage === 'en') {
        return Promise.resolve({
          pages: [
            {
              blocks: [
                {
                  index: 0,
                  sourceText: '全职觉醒',
                  translation: 'Full-Time Awakening',
                },
                { index: 1, sourceText: '第123话', translation: 'Chapter 123' },
                { index: 2, sourceText: '第122话', translation: 'Chapter 122' },
              ],
              pageKey: 'manga_page_english',
            },
          ],
        });
      }

      return Promise.resolve({
        pages: [
          {
            blocks: [
              {
                index: 0,
                sourceText: '作为最强觉醒者的神之兵团的队长白以',
                translation: 'بصفته قائد أقوى فيلق من المستيقظين...',
              },
              { index: 1, sourceText: '动作', translation: 'أكشن' },
            ],
            pageKey: 'manga_page_localized',
          },
        ],
      });
    });

    const result = await translateMangaPage(
      {
        chapters: [
          { key: '/123', name: '第123话', url: '/123' },
          { key: '/122', name: '第122话', url: '/122' },
        ],
        manga: {
          description: '作为最强觉醒者的神之兵团的队长白以',
          genres: ['动作'],
          title: '全职觉醒',
          url: '/manga/full-time-awakening',
        },
        sourceId: '1',
        sourceLanguage: 'zh',
        targetLanguage: 'ar',
      },
      { translate }
    );

    expect(result).toEqual({
      chapters: [
        { key: '/123', name: 'Chapter 123' },
        { key: '/122', name: 'Chapter 122' },
      ],
      manga: {
        description: 'بصفته قائد أقوى فيلق من المستيقظين...',
        genres: ['أكشن'],
        title: 'Full-Time Awakening',
      },
      targetLanguage: 'ar',
    });
    expect(translate).toHaveBeenCalledTimes(2);
    expect(translate).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: [
          {
            blocks: [
              { text: '全职觉醒' },
              { text: '第123话' },
              { text: '第122话' },
            ],
            pageKey: 'manga_page_english',
          },
        ],
        targetLanguage: 'en',
      })
    );
    expect(translate).toHaveBeenCalledWith(
      expect.objectContaining({
        pages: [
          {
            blocks: [
              { text: '作为最强觉醒者的神之兵团的队长白以' },
              { text: '动作' },
            ],
            pageKey: 'manga_page_localized',
          },
        ],
        targetLanguage: 'ar',
      })
    );
  });
});
