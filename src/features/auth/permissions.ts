import {
  createAccessControl,
  Role as BetterAuthRole,
} from 'better-auth/plugins/access';
import { adminAc, defaultStatements } from 'better-auth/plugins/admin/access';
import { z } from 'zod';

import { authClient } from '@/features/auth/client';
import { UserRole } from '@/server/db/generated/client';

const statement = {
  ...defaultStatements,
  account: ['read', 'update'],
  apps: ['app', 'manager'],
  staff: ['list', 'create', 'update', 'delete'],
  contact: ['read', 'update', 'delete'],
  license: ['read', 'manual-credit', 'revoke', 'generate-redeem-code'],
  device: ['read', 'revoke'],
  order: ['read', 'refund'],
  job: ['read', 'retry', 'cancel'],
  webhook: ['read', 'replay'],
  provider: ['read'],
  auditLog: ['read'],
} as const;

const ac = createAccessControl(statement);

const support = ac.newRole({
  account: ['update'],
  apps: ['manager'],
  staff: ['list'],
  contact: ['read', 'update'],
  license: ['read'],
  device: ['read'],
  order: ['read'],
  job: ['read'],
  provider: ['read'],
  auditLog: ['read'],
  session: ['list'],
});

const admin = ac.newRole({
  ...adminAc.statements,
  account: ['read', 'update'],
  apps: ['app', 'manager'],
  staff: ['list', 'create', 'update', 'delete'],
  contact: ['read', 'update', 'delete'],
  license: ['read', 'manual-credit', 'revoke', 'generate-redeem-code'],
  device: ['read', 'revoke'],
  order: ['read', 'refund'],
  job: ['read', 'retry', 'cancel'],
  webhook: ['read', 'replay'],
  provider: ['read'],
  auditLog: ['read'],
});

export const rolesNames = ['admin', 'support'] as const;
export const zRole: () => z.ZodType<Role> = () => z.enum(rolesNames);
export type Role = keyof typeof roles;
const roles = {
  admin,
  support,
} satisfies Record<UserRole, BetterAuthRole>;

export const permissions = {
  ac,
  roles,
};

export type Permission = NonNullable<
  Parameters<typeof authClient.admin.checkRolePermission>['0']['permissions']
>;

export const permissionApps = {
  app: ['app'],
  manager: ['manager'],
} as const satisfies Record<'app' | 'manager', Permission['apps']>;

export const permissionStaff = {
  list: { staff: ['list'] },
  create: { staff: ['create'] },
  update: { staff: ['update'] },
  delete: { staff: ['delete'] },
} as const satisfies Record<string, Permission>;

export const permissionContact = {
  read: { contact: ['read'] },
  update: { contact: ['update'] },
  delete: { contact: ['delete'] },
} as const satisfies Record<string, Permission>;

export const permissionLicense = {
  read: { license: ['read'] },
  manualCredit: { license: ['manual-credit'] },
  revoke: { license: ['revoke'] },
  generateRedeemCode: { license: ['generate-redeem-code'] },
} as const satisfies Record<string, Permission>;

export const permissionDevice = {
  read: { device: ['read'] },
  revoke: { device: ['revoke'] },
} as const satisfies Record<string, Permission>;

export const permissionOrder = {
  read: { order: ['read'] },
  refund: { order: ['refund'] },
} as const satisfies Record<string, Permission>;

export const permissionJob = {
  read: { job: ['read'] },
  retry: { job: ['retry'] },
  cancel: { job: ['cancel'] },
} as const satisfies Record<string, Permission>;

export const permissionProvider = {
  read: { provider: ['read'] },
} as const satisfies Record<string, Permission>;

export const permissionSession = {
  list: { session: ['list'] },
  revoke: { session: ['revoke'] },
} as const satisfies Record<string, Permission>;
