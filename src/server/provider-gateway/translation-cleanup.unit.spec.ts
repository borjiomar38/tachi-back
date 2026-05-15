import { describe, expect, it } from 'vitest';

import {
  cleanProviderTranslationText,
  shouldDropProviderTranslationBlock,
} from './translation-cleanup';

describe('provider translation cleanup', () => {
  it('drops explicit no-translation placeholders instead of rendering them', () => {
    expect(
      shouldDropProviderTranslationBlock({
        sourceText: '你 發',
        translation: '(لا ترجمة - نص صيني)',
      })
    ).toBe(true);

    expect(
      shouldDropProviderTranslationBlock({
        sourceText: '큰 효과음',
        translation: 'No translation - Korean text',
      })
    ).toBe(true);
  });

  it('keeps real translations after cleanup', () => {
    const translation = cleanProviderTranslationText(
      'سأذهب إلى العالم السري الثامن.'
    );

    expect(translation).toBe('سأذهب إلى العالم السري الثامن.');
    expect(
      shouldDropProviderTranslationBlock({
        sourceText: "FAN, I'LL LEAVE THE 9TH",
        translation,
      })
    ).toBe(false);
  });

  it('keeps Asian source speech with empty RTMTH cleanup for cached OCR retranslation', () => {
    expect(cleanProviderTranslationText('RTMTH')).toBe('');
    expect(
      shouldDropProviderTranslationBlock({
        mode: 'cached_ocr_source',
        sourceLanguage: 'zh',
        sourceText: '该 清理 垃圾 了 !',
        translation: 'RTMTH',
      })
    ).toBe(false);
  });

  it('still drops RTMTH marker blocks outside cached OCR source mode', () => {
    expect(
      shouldDropProviderTranslationBlock({
        sourceLanguage: 'zh',
        sourceText: '你 發',
        translation: 'RTMTH',
      })
    ).toBe(true);
  });

  it('still drops RTMTH watermark text in cached OCR source mode', () => {
    expect(
      shouldDropProviderTranslationBlock({
        mode: 'cached_ocr_source',
        sourceLanguage: 'zh',
        sourceText: '看 漫画',
        translation: 'RTMTH',
      })
    ).toBe(true);
  });
});
