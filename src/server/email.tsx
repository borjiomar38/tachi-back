import { render } from '@react-email/render';
import nodemailer from 'nodemailer';
import type { MailOptions } from 'nodemailer/lib/sendmail-transport';
import { ReactElement } from 'react';

import { DEFAULT_LANGUAGE_KEY } from '@/lib/i18n/constants';

import { envClient } from '@/env/client';
import { envServer } from '@/env/server';
import { logger } from '@/server/logger';

// eslint-disable-next-line sonarjs/no-clear-text-protocols
const transport = nodemailer.createTransport(envServer.EMAIL_SERVER);

export const sendEmail = async ({
  template,
  ...options
}: Omit<MailOptions, 'html'> &
  Required<Pick<MailOptions, 'subject'>> & { template: ReactElement }) => {
  if (envClient.VITE_IS_DEMO) {
    return;
  }

  const html = await render(template);
  const mailOptions = {
    from: envServer.EMAIL_FROM,
    html,
    ...options,
  };

  try {
    const result = await transport.sendMail(mailOptions);

    logger.info({
      scope: 'email',
      message: 'Email sent',
      to: normalizeMailboxField(mailOptions.to),
      subject: mailOptions.subject,
      messageId: result.messageId,
      response: result.response,
      accepted: result.accepted,
      rejected: result.rejected,
    });

    return result;
  } catch (error) {
    logger.error({
      scope: 'email',
      message: 'Email send failed',
      to: normalizeMailboxField(mailOptions.to),
      subject: mailOptions.subject,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
};

function normalizeMailboxField(value: MailOptions['to']) {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value.join(', ') : value;
}

export const previewEmailRoute = async (
  template: string,
  props: Record<string, string>
) => {
  let Email;
  try {
    const EmailModule = await import(`../emails/templates/${template}.tsx`);
    Email = EmailModule.default;
  } catch {
    return new Response('Template not found', {
      status: 404,
    });
  }

  const html = await render(
    <Email language={props?.language ?? DEFAULT_LANGUAGE_KEY} {...props} />
  );

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  });
};
