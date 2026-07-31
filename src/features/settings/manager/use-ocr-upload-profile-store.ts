import { create } from 'zustand';

import type { OcrUploadCompressionProfile } from '@/server/ocr-upload-compression/schema';

type CompressedOcrUploadProfile = Exclude<
  OcrUploadCompressionProfile,
  'original'
>;

interface OcrUploadProfileStore {
  lastCompressedProfile: CompressedOcrUploadProfile;
  rememberCompressedProfile: (profile: CompressedOcrUploadProfile) => void;
}

export const useOcrUploadProfileStore = create<OcrUploadProfileStore>(
  (set) => ({
    lastCompressedProfile: 'safe',
    rememberCompressedProfile: (lastCompressedProfile) => {
      set({ lastCompressedProfile });
    },
  })
);
