import { describe, expect, it } from 'vitest';

import {
  type AndroidApkDownload,
  androidApkDownload,
} from '@/features/public/download-assets';
import { buildDownloadStructuredData } from '@/features/public/download-structured-data';

const getSoftwareApplication = (apkDownload?: AndroidApkDownload) => {
  const structuredData = buildDownloadStructuredData(apkDownload);

  return structuredData.find(
    (entry) => entry['@type'] === 'SoftwareApplication'
  );
};

describe('buildDownloadStructuredData', () => {
  it('uses the ARM64 metadata resolved by the download page loader', () => {
    const liveApkDownload: AndroidApkDownload = {
      ...androidApkDownload,
      buildLabel: 'Android arm64 signed release 0.17.39',
      sha256:
        '73567ab5109d092ee8fa8e2b89a891d9af29b9aecfd06175bd136a706f54a8c1',
      sizeLabel: '65.16 MB',
    };

    expect(getSoftwareApplication(liveApkDownload)).toMatchObject({
      downloadUrl: expect.stringMatching(/\/api\/download\/apk$/),
      fileSize: liveApkDownload.sizeLabel,
      softwareVersion: liveApkDownload.buildLabel,
    });
  });

  it('falls back to the static safe ARM64 metadata', () => {
    expect(getSoftwareApplication()).toMatchObject({
      fileSize: androidApkDownload.sizeLabel,
      softwareVersion: androidApkDownload.buildLabel,
    });
  });
});
