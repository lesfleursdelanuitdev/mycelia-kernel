import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/message-system/global-scheduler.mycelia.js', () => {
  const GlobalScheduler = vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    setStrategy: vi.fn(),
    registerStrategy: vi.fn(),
    unregisterStrategy: vi.fn().mockReturnValue(true),
    getAvailableStrategies: vi.fn().mockReturnValue(['round-robin']),
    getCurrentStrategy: vi.fn().mockReturnValue('round-robin'),
    getStatistics: vi.fn().mockReturnValue({ ticks: 1 }),
    getSubsystemStatistics: vi.fn().mockReturnValue({ canvas: { ticks: 1 } }),
    clear: vi.fn(),
  }));
  return { GlobalScheduler };
});

import { useGlobalScheduler } from '../global-scheduler/use-global-scheduler.mycelia.js';
import { GlobalScheduler } from '../../models/message-system/global-scheduler.mycelia.js';

const createGlobalSchedulerFacet = ({ ctxOverrides = {}, config = {} } = {}) => {
  const ctx = { ms: {}, config: { globalScheduler: config }, ...ctxOverrides };
  const api = { name: 'kernel' };
  const subsystem = { name: 'kernel' };
  const facet = useGlobalScheduler(ctx, api, subsystem);
  return { facet };
};

describe('useGlobalScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires MessageSystem context', () => {
    const api = { name: 'kernel' };
    expect(() => useGlobalScheduler({ config: {} }, api, {})).toThrow(/MessageSystem/);
  });

  it('creates GlobalScheduler with config', () => {
    createGlobalSchedulerFacet({ config: { timeSliceDuration: 100, schedulingStrategy: 'priority' } });
    expect(GlobalScheduler).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      timeSliceDuration: 100,
      schedulingStrategy: 'priority',
    }));
  });

  it('exposes control methods', () => {
    const { facet } = createGlobalSchedulerFacet();
    const scheduler = GlobalScheduler.mock.results.at(-1).value;

    facet.start();
    expect(scheduler.start).toHaveBeenCalled();

    facet.stop();
    expect(scheduler.stop).toHaveBeenCalled();

    facet.setStrategy('fifo', { boost: true });
    expect(scheduler.setStrategy).toHaveBeenCalledWith('fifo', { boost: true });

    facet.registerStrategy('custom', vi.fn());
    expect(scheduler.registerStrategy).toHaveBeenCalled();

    expect(facet.unregisterStrategy('custom')).toBe(true);
    expect(scheduler.unregisterStrategy).toHaveBeenCalledWith('custom');

    expect(facet.getAvailableStrategies()).toEqual(['round-robin']);
    expect(facet.getCurrentStrategy()).toBe('round-robin');
    expect(facet.getStatistics()).toEqual({ ticks: 1 });
    expect(facet.getSubsystemStatistics()).toEqual({ canvas: { ticks: 1 } });

    facet.clear();
    expect(scheduler.clear).toHaveBeenCalled();
  });
});

