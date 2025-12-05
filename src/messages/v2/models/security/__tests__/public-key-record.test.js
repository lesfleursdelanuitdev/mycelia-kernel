import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PKR } from '../public-key-record.mycelia.js';

describe('PKR', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('validates constructor arguments', () => {
    const key = Symbol('pub');
    expect(() => new PKR({ uuid: '', kind: 'user', publicKey: key })).toThrow(/uuid/);
    expect(() => new PKR({ uuid: 'id', kind: null, publicKey: key })).toThrow(/kind/);
    expect(() => new PKR({ uuid: 'id', kind: 'user', publicKey: 'not-symbol' })).toThrow(/publicKey/);
  });

  it('computes expiration from human strings and checks validity', () => {
    const pubKey = Symbol('pub');
    const minter = Symbol('minter');
    const pkr = new PKR({
      uuid: 'id-1',
      name: 'Alice',
      kind: 'user',
      publicKey: pubKey,
      minter,
      expiration: '3 hours',
    });

    expect(pkr.uuid).toBe('id-1');
    expect(pkr.name).toBe('Alice');
    expect(pkr.publicKey).toBe(pubKey);

    expect(pkr.isMinter(minter)).toBe(true);
    expect(pkr.isValid(minter)).toBe(true);

    vi.advanceTimersByTime(4 * 60 * 60 * 1000);
    expect(pkr.isExpired()).toBe(true);
    expect(() => pkr.isMinter('not-symbol')).toThrow(/Symbol/);
  });

  it('serializes to JSON and compares equality', () => {
    const pubKey = Symbol('pub');
    const pkrA = new PKR({ uuid: 'id-1', kind: 'user', publicKey: pubKey });
    const pkrB = new PKR({ uuid: 'id-1', kind: 'user', publicKey: Symbol('other') });

    const json = pkrA.toJSON();
    expect(json).toEqual(
      expect.objectContaining({
        uuid: 'id-1',
        publicKey: pubKey.toString(),
      }),
    );
    expect(pkrA.toString()).toContain('PKR user');
    expect(pkrA.equals(pkrB)).toBe(true);
  });
});

