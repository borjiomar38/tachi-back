import { describe, expect, it } from 'vitest';

import { getPageTitle } from './get-page-title';

describe('getPageTitle', () => {
  it('builds the root title without an environment label', () => {
    expect(getPageTitle()).toBe('Tachiyomi Back');
  });

  it('builds page titles without an environment label', () => {
    expect(getPageTitle('Sign In')).toBe('Sign In | Tachiyomi Back');
  });
});
