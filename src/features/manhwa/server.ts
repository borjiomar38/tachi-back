import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { auth } from '@/server/auth';

export const canViewPrivateManhwaProgress = createServerFn({
  method: 'GET',
}).handler(async () => {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  return session?.user.role === 'admin';
});
