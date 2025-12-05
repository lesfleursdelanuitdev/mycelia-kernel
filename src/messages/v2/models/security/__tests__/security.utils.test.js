import { describe, it, expect, vi, afterEach } from 'vitest';
import { PRINCIPAL_KINDS, randomUUID } from '../security.utils.mycelia.js';

const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

function setCrypto(value) {
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value,
  });
}

function restoreCrypto() {
  if (cryptoDescriptor) {
    Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
  } else {
    delete globalThis.crypto;
  }
}

describe('security.utils', () => {
  afterEach(() => {
    restoreCrypto();
    vi.restoreAllMocks();
  });

  it('exposes principal kind constants', () => {
    expect(PRINCIPAL_KINDS).toEqual(
      expect.objectContaining({
        KERNEL: 'kernel',
        FRIEND: 'friend',
      }),
    );
  });

  it('generates uuid using crypto.getRandomValues when available', () => {
    const bytes = new Uint8Array(16);
    setCrypto({
      getRandomValues: vi.fn((buffer) => {
        buffer.set(bytes);
        return buffer;
      }),
    });
    const uuid = randomUUID();
    expect(globalThis.crypto.getRandomValues).toHaveBeenCalled();
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('falls back to Math.random when crypto unavailable', () => {
    setCrypto(undefined);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const uuid = randomUUID();
    expect(uuid).toMatch(/^[0-9a-f-]{36}$/);
  });
});

