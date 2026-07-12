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
      preview={`Your ${props.tokenAmount}-token Nayovi free trial code`}
      language={props.language}
    >
      <Container style={styles.container}>
        <Heading style={styles.h1}>Your Nayovi free trial code</Heading>
        <Section style={styles.section}>
          <Text style={styles.text}>
            Your protected free trial includes{' '}
            <strong>{props.tokenAmount} tokens</strong>.
          </Text>
          <Text style={styles.text}>
            Enter this redeem code in Nayovi to activate the trial on your
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
