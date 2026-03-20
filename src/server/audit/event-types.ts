// Phase 04 stub: persistence comes later, but privileged actions already have a
// central list so future handlers and UI screens share the same vocabulary.
export const privilegedAuditEventTypes = [
  'staff.created',
  'staff.updated',
  'staff.deleted',
  'staff.sessions.revoked',
  'license.manual_credit',
  'license.redeem_code.generated',
  'device.revoked',
  'order.refund_requested',
  'webhook.replayed',
  'job.retried',
  'job.canceled',
  'provider.config.viewed',
] as const;

export type PrivilegedAuditEventType =
  (typeof privilegedAuditEventTypes)[number];
