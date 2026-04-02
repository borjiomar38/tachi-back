import { createFileRoute } from '@tanstack/react-router';

import { createPublicContactMessage } from '@/server/contact/public-form';
import { zPublicContactMessageInput } from '@/server/contact/schema';
import { logger } from '@/server/logger';

export const Route = createFileRoute('/api/contact')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);

        try {
          const formData = await request.formData();
          const parsed = zPublicContactMessageInput.safeParse({
            email: formData.get('email'),
            message: formData.get('message'),
            name: formData.get('name'),
            subject: formData.get('subject'),
          });

          if (!parsed.success) {
            return Response.redirect(
              `${url.origin}/?contact=invalid#contact`,
              303
            );
          }

          const data = parsed.data;
          const forwardedFor = request.headers.get('x-forwarded-for');
          const ipAddress = forwardedFor?.split(',')[0]?.trim() || null;

          await createPublicContactMessage(data, {
            ipAddress,
            userAgent: request.headers.get('user-agent'),
          });

          return Response.redirect(`${url.origin}/?contact=sent#contact`, 303);
        } catch (error) {
          logger.error({
            errorMessage:
              error instanceof Error ? error.message : 'Unknown error',
            scope: 'public-contact',
          });

          return Response.redirect(`${url.origin}/?contact=error#contact`, 303);
        }
      },
    },
  },
});
