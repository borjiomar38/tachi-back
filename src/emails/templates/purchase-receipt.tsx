import { Container, Heading, Section, Text } from '@react-email/components';

import { EmailFooter } from '@/emails/components/email-footer';
import { EmailLayout } from '@/emails/components/email-layout';
import { styles } from '@/emails/styles';

const formatTokenCount = (value: number) =>
  new Intl.NumberFormat('en-US').format(value);

export const TemplatePurchaseReceipt = (props: {
  language: string;
  packName: string;
  redeemCode: string;
  totalTokens: number;
}) => {
  return (
    <EmailLayout
      preview={`Your Tachiyomi Back redeem code for ${props.packName}`}
      language={props.language}
    >
      <Container style={styles.container}>
        <Heading style={styles.h1}>
          Your subscription payment is confirmed
        </Heading>
        <Section style={styles.section}>
          <Text style={styles.text}>
            Lemon Squeezy billing for <strong>{props.packName}</strong> is now
            linked to a Tachiyomi Back license with{' '}
            <strong>
              {formatTokenCount(props.totalTokens)} monthly tokens
            </strong>
            .
          </Text>
          <Text style={styles.text}>
            Use this redeem code in TachiyomiAT to activate hosted access on
            your device:
          </Text>
          <Text style={styles.code}>{props.redeemCode}</Text>
          <Text style={styles.textMuted}>
            Open the Tachiyomi Back settings in the app, enter the redeem code,
            and complete device activation. Keep this email for support if you
            need recovery help later.
          </Text>
        </Section>
        <EmailFooter />
      </Container>
    </EmailLayout>
  );
};

export default TemplatePurchaseReceipt;
