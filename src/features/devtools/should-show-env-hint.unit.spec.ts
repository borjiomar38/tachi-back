import { describe, expect, it } from 'vitest';

import { shouldShowEnvHint } from './should-show-env-hint';

describe('shouldShowEnvHint', () => {
  it('hides the hint in production environments', () => {
    expect(shouldShowEnvHint('PRODUCTION')).toBe(false);
    expect(shouldShowEnvHint('prod')).toBe(false);
  });

  it('shows the hint for non-production environments', () => {
    expect(shouldShowEnvHint('LOCAL')).toBe(true);
    expect(shouldShowEnvHint('staging')).toBe(true);
  });

  it('hides the hint when no environment name is configured', () => {
    expect(shouldShowEnvHint()).toBe(false);
    expect(shouldShowEnvHint('')).toBe(false);
  });
});
