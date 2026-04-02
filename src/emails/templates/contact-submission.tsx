import { Container, Heading, Section, Text } from '@react-email/components';

import { EmailFooter } from '@/emails/components/email-footer';
import { EmailLayout } from '@/emails/components/email-layout';
import { styles } from '@/emails/styles';

export const TemplateContactSubmission = (props: {
  email: string;
  language: string;
  message: string;
  name: string;
  subject: string;
}) => {
  return (
    <EmailLayout
      preview={`New Tachiyomi Back contact form: ${props.subject}`}
      language={props.language}
    >
      <Container style={styles.container}>
        <Heading style={styles.h1}>New public contact form submission</Heading>
        <Section style={styles.section}>
          <Text style={styles.text}>
            <strong>Name:</strong> {props.name}
          </Text>
          <Text style={styles.text}>
            <strong>Email:</strong> {props.email}
          </Text>
          <Text style={styles.text}>
            <strong>Subject:</strong> {props.subject}
          </Text>
          <Text style={styles.textMuted}>Message</Text>
          <Text style={{ ...styles.text, whiteSpace: 'pre-line' }}>
            {props.message}
          </Text>
        </Section>
        <EmailFooter />
      </Container>
    </EmailLayout>
  );
};

export default TemplateContactSubmission;
