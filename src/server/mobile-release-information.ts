import { z } from 'zod';

const zReleaseContent = () =>
  z
    .object({
      title: z.string().trim().min(1).max(120),
      summary: z.string().trim().min(1).max(1200),
      highlights: z
        .array(
          z
            .object({
              icon: z.enum([
                'library',
                'download',
                'reader',
                'updates',
                'translation',
                'info',
              ]),
              title: z.string().trim().min(1).max(100),
              body: z.string().trim().min(1).max(600),
            })
            .strict()
        )
        .max(6),
    })
    .strict();

export const zMobileReleaseInformation = () =>
  z
    .object({
      schemaVersion: z.literal(1),
      versionCode: z.number().int().positive(),
      versionName: z.string().trim().min(1).max(64),
      defaultLocale: z.string().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/),
      locales: z.record(
        z.string().regex(/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/),
        zReleaseContent()
      ),
    })
    .strict()
    .superRefine((info, context) => {
      if (
        !info.locales[info.defaultLocale] ||
        Object.keys(info.locales).length > 30
      ) {
        context.addIssue({
          code: 'custom',
          path: ['locales'],
          message: 'Provide the default locale and at most 30 locales',
        });
      }
    });

export type MobileReleaseInformation = z.infer<
  ReturnType<typeof zMobileReleaseInformation>
>;
