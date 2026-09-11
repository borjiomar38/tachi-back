import { Container, Heading, Text } from '@react-email/components';

import i18n from '@/lib/i18n';

import { EmailFooter } from '@/emails/components/email-footer';
import { EmailLayout } from '@/emails/components/email-layout';
import { styles } from '@/emails/styles';

interface TokenPurchaseReceiptProps {
  language: 'en' | 'fr';
  packName: string;
  totalTokens: number;
  redeemCode: string;
}

export const TokenPurchaseReceipt = (props: TokenPurchaseReceiptProps) => {
  const t = i18n.getFixedT(props.language, ['emails', 'common']);
  return (
    <EmailLayout
      language={props.language}
      preview={t('emails:tokenPurchase.preview')}
    >
      <Container style={styles.container}>
        <Heading style={styles.h1}>{t('emails:tokenPurchase.title')}</Heading>
        <Text style={styles.text}>
          {t('emails:tokenPurchase.pack', {
            pack: props.packName,
            tokens: props.totalTokens.toLocaleString(props.language),
          })}
        </Text>
        <Text style={styles.text}>{t('emails:tokenPurchase.return')}</Text>
        <Text style={styles.text}>{t('emails:tokenPurchase.redeem')}</Text>
        <Text style={styles.code}>{props.redeemCode}</Text>
        <Text style={styles.textMuted}>
          {t('emails:tokenPurchase.recovery')}
        </Text>
        <EmailFooter />
      </Container>
    </EmailLayout>
  );
};
