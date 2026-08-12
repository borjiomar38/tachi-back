import { describe, expect, it } from 'vitest';

import {
  androidApkDownload,
  getAndroidApkDownloadMetadata,
} from '@/features/public/download-assets';

describe('getAndroidApkDownloadMetadata', () => {
  it('uses signed universal artifact metadata from the promoted policy', () => {
    const metadata = getAndroidApkDownloadMetadata({
      sha256:
        '86d390ffaf1d665f29907da1ee9f80a0058fd5d93241b0a77d2b3b17346ca12e',
      sizeBytes: 182_909_344,
      variant: 'universal',
      versionName: '0.17.37',
    });

    expect(metadata.buildLabel).toBe(
      'Android universal signed release 0.17.37'
    );
    expect(metadata.sizeLabel).toBe('174.44 MB');
    expect(metadata.sha256).toBe(
      '86d390ffaf1d665f29907da1ee9f80a0058fd5d93241b0a77d2b3b17346ca12e'
    );
  });

  it('keeps accurate live fallback metadata before the next policy promotion', () => {
    const metadata = getAndroidApkDownloadMetadata({ versionName: '0.17.36' });

    expect(metadata.buildLabel).toBe('Android arm64 signed release 0.17.36');
    expect(metadata.sizeLabel).toBe(androidApkDownload.sizeLabel);
    expect(metadata.sha256).toBe(androidApkDownload.sha256);
  });
});
