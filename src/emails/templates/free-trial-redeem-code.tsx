import { Container, Heading, Section, Text } from '@react-email/components';

import { EmailFooter } from '@/emails/components/email-footer';
import { EmailLayout } from '@/emails/components/email-layout';
import { styles } from '@/emails/styles';

export const TemplateFreeTrialRedeemCode = (props: {
  language: string;
  redeemCode: string;
  tokenAmount: number;
}) => {
  return (
    <EmailLayout
      preview="Your Nayovi free trial activation code"
      language={props.language}
    >
      <Container style={styles.container}>
        <Heading style={styles.h1}>Your Nayovi free trial is ready</Heading>
        <Section style={styles.section}>
          <Text style={styles.text}>Your one-time free trial is ready.</Text>
          <Text style={styles.text}>
            Enter this activation code in Nayovi to start translating on your
            device:
          </Text>
          <Text style={styles.code}>{props.redeemCode}</Text>
          <Text style={styles.textMuted}>
            This code is tied to the device and email used for the request. Do
            not forward it to another person.
          </Text>
        </Section>
        <EmailFooter />
      </Container>
    </EmailLayout>
  );
};

export default TemplateFreeTrialRedeemCode;
