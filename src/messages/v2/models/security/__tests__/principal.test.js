import { describe, it, expect, vi, beforeEach } from 'vitest';

const createdPkrs = [];
vi.mock('../public-key-record.mycelia.js', () => ({
  PKR: vi.fn().mockImplementation((opts) => {
    createdPkrs.push(opts);
    return { ...opts, toJSON: () => opts, isMockPKR: true };
  }),
}));

vi.mock('../security.utils.mycelia.js', () => ({
  randomUUID: vi.fn()
    .mockReturnValueOnce('uuid-1')
    .mockReturnValueOnce('uuid-2'),
  PRINCIPAL_KINDS: {
    KERNEL: 'kernel',
    TOP_LEVEL: 'topLevel',
    CHILD: 'child',
    FRIEND: 'friend',
    RESOURCE: 'resource',
  },
}));

import { Principal } from '../principal.mycelia.js';
import { PKR } from '../public-key-record.mycelia.js';
import { randomUUID, PRINCIPAL_KINDS } from '../security.utils.mycelia.js';

describe('Principal', () => {
  const publicKey = Symbol('pub');
  const kernelKey = Symbol('kernel');

  beforeEach(() => {
    createdPkrs.length = 0;
    vi.clearAllMocks();
    randomUUID.mockReturnValueOnce('uuid-1').mockReturnValue('uuid-2');
  });

  it('validates constructor inputs and attaches allowed instances', () => {
    expect(() => new Principal({ kind: null, publicKey })).toThrow(/kind/);
    expect(() => new Principal({ kind: 'user', publicKey: 'not-symbol' })).toThrow(/publicKey/);
    expect(() => new Principal({ kind: 'user', publicKey, kernelId: 'not-symbol' })).toThrow(/kernelId/);

    const principal = new Principal({ kind: PRINCIPAL_KINDS.TOP_LEVEL, publicKey });
    principal.attachInstance({ subsystem: true });
    expect(() => principal.attachInstance({})).toThrow(/already attached/);

    const invalidKindPrincipal = new Principal({ kind: 'external', publicKey });
    expect(() => invalidKindPrincipal.attachInstance({})).toThrow(/invalid kind/);
  });

  it('memoizes PKR and refreshes with new public key', () => {
    const principal = new Principal({ kind: PRINCIPAL_KINDS.KERNEL, publicKey, kernelId: kernelKey });
    const firstPKR = principal.pkr;
    expect(PKR).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: 'uuid-1', minter: kernelKey }),
    );
    const newKey = Symbol('new-key');
    const refreshed = principal.refresh(newKey);
    expect(PKR).toHaveBeenCalledWith(
      expect.objectContaining({ publicKey: newKey }),
    );
    expect(refreshed).not.toBe(firstPKR);
  });

  it('renames, serializes, compares equality', () => {
    const principal = new Principal({ kind: PRINCIPAL_KINDS.FRIEND, publicKey });
    principal.rename('Alice');
    expect(principal.name).toBe('Alice');
    const record = principal.toRecord();
    expect(record).toEqual(expect.objectContaining({ name: 'Alice' }));
    expect(principal.toString()).toContain('Principal friend');
    expect(principal.equals({})).toBe(false);
    const same = principal;
    expect(principal.equals(same)).toBe(true);
  });
});

