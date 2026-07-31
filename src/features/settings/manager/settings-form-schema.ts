import { z } from 'zod';

import { zFreeTrialRuntimeConfig } from '@/server/licenses/free-trial-settings-schema';
import { zOcrUploadCompressionRuntimeConfig } from '@/server/ocr-upload-compression/schema';

export const createSettingsFormSchema = () =>
  z
    .object({
      freeTrial: zFreeTrialRuntimeConfig,
      ocrUpload: zOcrUploadCompressionRuntimeConfig,
    })
    .strict();

export type SettingsFormValues = z.infer<
  ReturnType<typeof createSettingsFormSchema>
>;
