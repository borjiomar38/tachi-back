import type { OcrUploadCompressionProfile } from '@/server/ocr-upload-compression/schema';

type CompressedOcrUploadProfile = Exclude<
  OcrUploadCompressionProfile,
  'original'
>;

interface ResolveOcrUploadProfileAfterToggleInput {
  checked: boolean;
  currentProfile: OcrUploadCompressionProfile;
  lastCompressedProfile: CompressedOcrUploadProfile;
}

export const isOcrUploadCompressionEnabled = (
  profile: OcrUploadCompressionProfile
): boolean => profile !== 'original';

export const resolveOcrUploadProfileAfterToggle = ({
  checked,
  currentProfile,
  lastCompressedProfile,
}: ResolveOcrUploadProfileAfterToggleInput): OcrUploadCompressionProfile => {
  if (!checked) {
    return 'original';
  }

  return currentProfile === 'original' ? lastCompressedProfile : currentProfile;
};
