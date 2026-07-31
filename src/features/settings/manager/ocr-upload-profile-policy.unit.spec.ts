import { describe, expect, it } from 'vitest';

import {
  isOcrUploadCompressionEnabled,
  resolveOcrUploadProfileAfterToggle,
} from '@/features/settings/manager/ocr-upload-profile-policy';

describe('OCR upload profile UI policy', () => {
  it('maps the off state to the Original profile', () => {
    expect(
      resolveOcrUploadProfileAfterToggle({
        checked: false,
        currentProfile: 'strong',
        lastCompressedProfile: 'strong',
      })
    ).toBe('original');
  });

  it('restores the last compressed profile when switched back on', () => {
    expect(
      resolveOcrUploadProfileAfterToggle({
        checked: true,
        currentProfile: 'original',
        lastCompressedProfile: 'balanced',
      })
    ).toBe('balanced');
  });

  it('keeps the current compressed profile when already enabled', () => {
    expect(
      resolveOcrUploadProfileAfterToggle({
        checked: true,
        currentProfile: 'custom',
        lastCompressedProfile: 'safe',
      })
    ).toBe('custom');
  });

  it('derives the switch state from the persisted profile', () => {
    expect(isOcrUploadCompressionEnabled('original')).toBe(false);
    expect(isOcrUploadCompressionEnabled('safe')).toBe(true);
  });
});
