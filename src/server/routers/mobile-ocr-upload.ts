import {
  zOcrUploadCompressionRuntimeConfig,
  zOcrUploadCompressionRuntimeState,
} from '@/server/ocr-upload-compression/schema';
import {
  getOcrUploadCompressionRuntimeConfig,
  updateOcrUploadCompressionRuntimeConfig,
} from '@/server/ocr-upload-compression/service';
import { protectedProcedure } from '@/server/orpc';

const tags = ['mobile-ocr-upload'];

export default {
  getRuntimeConfig: protectedProcedure({
    permissions: {
      staff: ['list'],
    },
  })
    .route({
      method: 'GET',
      path: '/mobile-ocr-upload/runtime-config',
      tags,
    })
    .output(zOcrUploadCompressionRuntimeState)
    .handler(async ({ context }) => {
      return await getOcrUploadCompressionRuntimeConfig({
        dbClient: context.db,
      });
    }),

  updateRuntimeConfig: protectedProcedure({
    permissions: {
      staff: ['update'],
    },
  })
    .route({
      method: 'POST',
      path: '/mobile-ocr-upload/runtime-config',
      tags,
    })
    .input(zOcrUploadCompressionRuntimeConfig)
    .output(zOcrUploadCompressionRuntimeState)
    .handler(async ({ context, input }) => {
      return await updateOcrUploadCompressionRuntimeConfig(input, {
        dbClient: context.db,
      });
    }),
};
