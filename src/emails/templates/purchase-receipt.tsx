import { Container, Heading, Section, Text } from '@react-email/components';

import { EmailFooter } from '@/emails/components/email-footer';
import { EmailLayout } from '@/emails/components/email-layout';
import { styles } from '@/emails/styles';

export const TemplatePurchaseReceipt = (props: {
  language: string;
  packName: string;
  redeemCode: string;
  totalTokens: number;
}) => {
  return (
    <EmailLayout
      preview={`Your Nayovi activation code for ${props.packName}`}
      language={props.language}
    >
      <Container style={styles.container}>
        <Heading style={styles.h1}>
          Your subscription payment is confirmed
        </Heading>
        <Section style={styles.section}>
          <Text style={styles.text}>
            Your <strong>{props.packName}</strong> monthly plan is now active.
          </Text>
          <Text style={styles.text}>
            Use this activation code in Nayovi to activate the app on your
            device:
          </Text>
          <Text style={styles.code}>{props.redeemCode}</Text>
          <Text style={styles.textMuted}>
            Open the Nayovi settings in the app, enter the activation code, and
            complete device activation. Keep this email for support if you need
            recovery help later.
          </Text>
        </Section>
        <EmailFooter />
      </Container>
    </EmailLayout>
  );
};

export default TemplatePurchaseReceipt;
