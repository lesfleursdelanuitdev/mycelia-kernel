import { describe, it, expect } from 'vitest';
import { getDebugFlag } from '../debug-flag.utils.mycelia.js';

describe('getDebugFlag', () => {
  it('prefers config debug flag when provided', () => {
    expect(getDebugFlag({ debug: true }, { debug: false })).toBe(true);
    expect(getDebugFlag({ debug: false }, { debug: true })).toBe(false);
  });

  it('falls back to ctx debug when config missing', () => {
    expect(getDebugFlag({}, { debug: true })).toBe(true);
    expect(getDebugFlag(undefined, { debug: false })).toBe(false);
  });

  it('defaults to false when no flags present', () => {
    expect(getDebugFlag({}, {})).toBe(false);
    expect(getDebugFlag()).toBe(false);
  });
});

