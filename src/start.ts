import { createMiddleware, createStart } from '@tanstack/react-start';

import { createCanonicalHostRedirectResponse } from '@/features/public/redirect-policy';

const canonicalHostMiddleware = createMiddleware({ type: 'request' }).server(
  ({ next, request }) => {
    const redirectResponse = createCanonicalHostRedirectResponse(request);

    if (redirectResponse) {
      return redirectResponse;
    }

    return next();
  }
);

export const startInstance = createStart(() => ({
  requestMiddleware: [canonicalHostMiddleware],
}));
