import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/kernel-subsystem/error-manager-subsystem/bounded-error-store.mycelia.js', () => {
  const createStore = () => ({
    add: vi.fn().mockReturnValue({ id: 'err-1' }),
    get: vi.fn().mockReturnValue({ id: 'err-1' }),
    list: vi.fn().mockReturnValue([]),
    recent: vi.fn().mockReturnValue([]),
    summarize: vi.fn().mockReturnValue({ total: 0 }),
    clear: vi.fn(),
    get size() {
      return 1;
    },
    get capacity() {
      return 100;
    },
    get all() {
      return [];
    },
  });

  const BoundedErrorStore = vi.fn().mockImplementation(() => createStore());
  return { BoundedErrorStore };
});

import { useBoundedErrorStore } from '../bounded-error-store/use-bounded-error-store.mycelia.js';
import { BoundedErrorStore } from '../../models/kernel-subsystem/error-manager-subsystem/bounded-error-store.mycelia.js';

const createFacet = ({ capacity } = {}) => {
  const ctx = { config: { boundedErrorStore: capacity ? { capacity } : {} } };
  const api = { name: 'kernel' };
  const subsystem = { name: 'kernel' };
  return useBoundedErrorStore(ctx, api, subsystem);
};

describe('useBoundedErrorStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates BoundedErrorStore with configured capacity', () => {
    createFacet({ capacity: 10 });
    expect(BoundedErrorStore).toHaveBeenCalledWith(10);
  });

  it('exposes store helpers', () => {
    const facet = createFacet();
    const store = BoundedErrorStore.mock.results.at(-1).value;

    expect(facet.add({ message: 'boom' })).toEqual({ id: 'err-1' });
    expect(store.add).toHaveBeenCalled();

    facet.get('err-1');
    expect(store.get).toHaveBeenCalledWith('err-1');

    facet.list();
    expect(store.list).toHaveBeenCalled();

    facet.recent(5);
    expect(store.recent).toHaveBeenCalledWith(5);

    facet.summarize({ since: new Date() });
    expect(store.summarize).toHaveBeenCalled();

    facet.clear();
    expect(store.clear).toHaveBeenCalled();

    expect(facet.size).toBe(1);
    expect(facet.capacity).toBe(100);
    expect(facet.all).toEqual([]);
  });
});

