import {
  CircleCheckIcon,
  CircleHelpIcon,
  Clock3Icon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

import type { ContactTriageView } from '@/server/contact/schema';

interface ContactTriageBadgeProps {
  triage: Pick<ContactTriageView, 'classification' | 'state'>;
}

const classificationVariants = {
  actionable: 'positive',
  irrelevant: 'secondary',
  malicious: 'negative',
  uncertain: 'warning',
} as const;

const stateVariants = {
  awaiting: 'secondary',
  failed: 'negative',
  filtered: 'secondary',
  forwarded: 'positive',
  processing: 'brand',
  retrying: 'warning',
} as const;

const stateIcons = {
  awaiting: Clock3Icon,
  failed: ShieldAlertIcon,
  filtered: ShieldAlertIcon,
  forwarded: CircleCheckIcon,
  processing: RefreshCwIcon,
  retrying: RefreshCwIcon,
} as const;

export const ContactTriageBadge = ({ triage }: ContactTriageBadgeProps) => {
  const { t } = useTranslation(['contact']);
  const Icon = triage.classification
    ? triage.classification === 'malicious'
      ? ShieldAlertIcon
      : triage.classification === 'actionable'
        ? CircleCheckIcon
        : CircleHelpIcon
    : stateIcons[triage.state];
  const label = triage.classification
    ? t(`contact:triage.classification.${triage.classification}`)
    : t(`contact:triage.state.${triage.state}`);
  const variant = triage.classification
    ? classificationVariants[triage.classification]
    : stateVariants[triage.state];

  return (
    <Badge variant={variant}>
      <Icon />
      {label}
    </Badge>
  );
};
