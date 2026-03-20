import { Section, Text } from '@react-email/components';

import { styles } from '@/emails/styles';

export const EmailFooter = () => {
  return (
    <Section style={styles.footer}>
      <Text style={styles.text}>
        <strong>Tachiyomi Back</strong>
        <br />
        Internal admin and hosted translation backend
      </Text>
    </Section>
  );
};
