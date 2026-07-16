import nodemailer from 'nodemailer';

import { envServer } from '@/env/server';

export interface ContactNotificationInput {
  classification: string;
  contactId: string;
  email: string;
  message: string;
  name: string;
  subject: string;
}

const transport = nodemailer.createTransport(envServer.EMAIL_SERVER);

const sanitizeHeader = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

export const getContactNotificationId = (contactId: string) =>
  `contact-${contactId.replaceAll(/[^a-zA-Z0-9._-]/g, '-')}`;

export const sendContactNotification = async (
  input: ContactNotificationInput
) =>
  await transport.sendMail({
    from: envServer.EMAIL_FROM,
    messageId: `<${getContactNotificationId(input.contactId)}@nayovi.com>`,
    replyTo: sanitizeHeader(input.email),
    subject: `[Contact ${input.classification}] ${sanitizeHeader(input.subject)}`,
    text: [
      `Classification: ${input.classification}`,
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Subject: ${input.subject}`,
      '',
      input.message,
    ].join('\n'),
    to: envServer.SUPPORT_EMAIL,
  });
