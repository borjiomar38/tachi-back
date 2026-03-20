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
        <Heading style={styles.h1}>Your purchase is recorded</Heading>
        <Section style={styles.section}>
          <Text style={styles.text}>
            Stripe payment for <strong>{props.packName}</strong> is now linked
            to a pending Tachiyomi Back license with{' '}
            <strong>{formatTokenCount(props.totalTokens)} tokens</strong>.
          </Text>
          <Text style={styles.text}>
            Keep this redeem code for the activation flow:
          </Text>
          <Text style={styles.code}>{props.redeemCode}</Text>
          <Text style={styles.textMuted}>
            Hosted activation and device binding still land in later phases, so
            support may guide the first redemptions manually while the Android
            flow is being connected.
          </Text>
        </Section>
        <EmailFooter />
      </Container>
    </EmailLayout>
  );
};

export default TemplatePurchaseReceipt;
