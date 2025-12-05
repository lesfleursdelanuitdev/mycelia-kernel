import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../queue/subsystem-queue-manager.mycelia.js', () => {
  const SubsystemQueueManager = vi.fn().mockImplementation((options) => ({
    options,
    getStatus: vi.fn().mockReturnValue({ size: 1 }),
    clear: vi.fn(),
    isEmpty: vi.fn().mockReturnValue(false),
    dequeue: vi.fn().mockReturnValue({ msg: { id: 1 }, options: {} }),
    getQueue: vi.fn().mockReturnValue({
      capacity: 100,
      setDebug: vi.fn(),
    }),
  }));
  return { SubsystemQueueManager };
});

import { useQueue } from '../queue/use-queue.mycelia.js';
import { SubsystemQueueManager } from '../queue/subsystem-queue-manager.mycelia.js';

const createQueueFacet = ({ config = {}, statisticsFacet = { facetKind: 'statistics', _statistics: { recordQueueFull: vi.fn() } } } = {}) => {
  const ctx = { config: { queue: config } };
  const facets = { statistics: statisticsFacet };
  const facetManager = {
    ...facets,
    find: (kind) => facets[kind] || null,
  };
  const api = {
    name: 'canvas',
    __facets: facetManager,
  };
  const subsystem = { name: 'canvas' };
  const facet = useQueue(ctx, api, subsystem);
  return { facet };
};

describe('useQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes SubsystemQueueManager with config and statistics callbacks', () => {
    const statisticsFacet = {
      _statistics: { recordQueueFull: vi.fn() },
    };
    createQueueFacet({ config: { capacity: 5, policy: 'drop-newest', debug: true }, statisticsFacet });
    expect(SubsystemQueueManager).toHaveBeenCalledWith({
      capacity: 5,
      policy: 'drop-newest',
      debug: true,
      subsystemName: 'canvas',
      onQueueFull: expect.any(Function),
    });
  });

  it('exposes queue operations', () => {
    const { facet } = createQueueFacet();
    const manager = SubsystemQueueManager.mock.results.at(-1).value;

    expect(facet.getQueueStatus({ isProcessing: true })).toEqual({ size: 1 });
    expect(manager.getStatus).toHaveBeenCalledWith({ isProcessing: true });

    facet.clearQueue();
    expect(manager.clear).toHaveBeenCalled();

    expect(facet.hasMessagesToProcess()).toBe(true);
    expect(manager.isEmpty).toHaveBeenCalled();

    expect(facet.selectNextMessage()).toEqual({ msg: { id: 1 }, options: {} });
    expect(manager.dequeue).toHaveBeenCalled();
  });
});

