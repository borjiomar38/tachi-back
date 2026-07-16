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
  delivery_unknown: 'warning',
  failed: 'negative',
  filtered: 'secondary',
  forwarded: 'positive',
  processing: 'brand',
  retrying: 'warning',
} as const;

const stateIcons = {
  awaiting: Clock3Icon,
  delivery_unknown: CircleHelpIcon,
  failed: ShieldAlertIcon,
  filtered: ShieldAlertIcon,
  forwarded: CircleCheckIcon,
  processing: RefreshCwIcon,
  retrying: RefreshCwIcon,
} as const;

export const ContactTriageBadge = ({ triage }: ContactTriageBadgeProps) => {
  const { t } = useTranslation(['contact']);
  if (
    !triage.classification ||
    triage.state === 'failed' ||
    triage.state === 'delivery_unknown'
  ) {
    const StateIcon = stateIcons[triage.state];

    return (
      <Badge variant={stateVariants[triage.state]}>
        <StateIcon />
        {t(`contact:triage.state.${triage.state}`)}
      </Badge>
    );
  }

  const Icon =
    triage.classification === 'malicious'
      ? ShieldAlertIcon
      : triage.classification === 'actionable'
        ? CircleCheckIcon
        : CircleHelpIcon;

  return (
    <Badge variant={classificationVariants[triage.classification]}>
      <Icon />
      {t(`contact:triage.classification.${triage.classification}`)}
    </Badge>
  );
};
