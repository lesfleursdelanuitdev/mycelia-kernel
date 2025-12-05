import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../scheduler/subsystem-scheduler.mycelia.js', () => {
  const SubsystemScheduler = vi.fn().mockImplementation(() => ({
    process: vi.fn().mockResolvedValue({ processed: 1 }),
    setStrategy: vi.fn(),
    options: { maxMessagesPerSlice: 10 },
  }));
  return { SubsystemScheduler };
});

import { useScheduler } from '../scheduler/use-scheduler.mycelia.js';
import { SubsystemScheduler } from '../scheduler/subsystem-scheduler.mycelia.js';

const buildFacets = () => ({
  queue: { facetKind: 'queue' },
  processor: { facetKind: 'processor' },
  statistics: { facetKind: 'statistics', _statistics: { recordTimeSlice: vi.fn() } },
  queries: { facetKind: 'queries' },
});

const createSchedulerFacet = ({ config = {}, facetsOverrides = {} } = {}) => {
  const baseFacets = { ...buildFacets(), ...facetsOverrides };
  const facetManager = {
    ...baseFacets,
    find: (kind) => baseFacets[kind] || null,
  };
  const ctx = { config: { scheduler: config } };
  const api = { name: 'canvas', __facets: facetManager };
  const subsystem = { name: 'canvas', find: () => null };
  const facet = useScheduler(ctx, api, subsystem);
  return { facet, facets: baseFacets };
};

describe('useScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes SubsystemScheduler with configuration', () => {
    createSchedulerFacet({ config: { schedulingStrategy: 'round-robin', maxMessagesPerSlice: 5, priority: 2 } });
    expect(SubsystemScheduler).toHaveBeenCalledWith(expect.any(Object), {
      schedulingStrategy: 'round-robin',
      maxMessagesPerSlice: 5,
      debug: false,
    });
  });

  it('process respects pause state', async () => {
    const { facet } = createSchedulerFacet();
    facet.pauseProcessing();
    const result = await facet.process(10);
    expect(result).toEqual({ processed: 0, remainingTime: 10, status: 'paused' });

    facet.resumeProcessing();
    const scheduler = SubsystemScheduler.mock.results.at(-1).value;
    scheduler.process.mockResolvedValueOnce({ processed: 1, remaining: 0 });
    const stats = await facet.process(5);
    expect(scheduler.process).toHaveBeenCalledWith(5);
    expect(stats).toEqual({ processed: 1, remaining: 0 });
  });

  it('tracks priority and processing flags', () => {
    const { facet } = createSchedulerFacet();
    expect(facet.getPriority()).toBe(1);
    facet.setPriority(3);
    expect(facet.getPriority()).toBe(3);

    expect(facet.isPaused()).toBe(false);
    facet.pauseProcessing();
    expect(facet.isPaused()).toBe(true);
  });

  it('configures scheduler strategy and max messages', () => {
    const { facet } = createSchedulerFacet();
    const scheduler = SubsystemScheduler.mock.results.at(-1).value;
    facet.configureScheduler({ strategy: 'fifo', maxMessagesPerSlice: 20, strategyOptions: { boost: true } });
    expect(scheduler.setStrategy).toHaveBeenCalledWith('fifo', { boost: true });
    expect(scheduler.options.maxMessagesPerSlice).toBe(20);
  });

  // useScheduler relies on createHook's dependency ordering rather than runtime throws,
  // so we skip explicit missing-facet assertions here.
});

