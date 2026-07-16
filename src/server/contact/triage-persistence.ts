import type { ContactTriageResult } from '@/server/contact/triage-policy';
import { resolveContactTriage } from '@/server/contact/triage-policy';

export const getContactTriagePersistence = (result: ContactTriageResult) => {
  const decision = resolveContactTriage(result);

  return {
    decision,
    status:
      result.classification === 'malicious'
        ? ('spam' as const)
        : result.classification === 'irrelevant'
          ? ('resolved' as const)
          : decision.replyToCustomer
            ? ('resolved' as const)
            : undefined,
  };
};
