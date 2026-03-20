import { ReactNode } from 'react';

import { PageError } from '@/components/errors/page-error';
import { Spinner } from '@/components/ui/spinner';

import { Permission } from '@/features/auth/permissions';
import { WithPermissions } from '@/features/auth/with-permissions';

export const GuardPermissions = (props: {
  permissions: Permission[];
  children?: ReactNode;
}) => {
  return (
    <WithPermissions
      permissions={props.permissions}
      loadingFallback={<Spinner full className="opacity-60" />}
      fallback={<PageError type="403" />}
    >
      {props.children}
    </WithPermissions>
  );
};
