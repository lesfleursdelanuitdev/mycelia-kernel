import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  const roundRobin = vi.fn((subs, options) => {
    options.onSelection(0);
    return subs[0];
  });
  const defaultStrategies = new Map([['round-robin', roundRobin]]);

  return {
    DEFAULT_STRATEGIES: defaultStrategies,
    getStrategyNames: vi.fn(() => Array.from(defaultStrategies.keys())),
    validateStrategyOptions: vi.fn(() => ({ valid: true, errors: [] })),
  };
});

vi.mock('../utils/global-scheduling-strategies.utils.mycelia.js', () => ({
  DEFAULT_STRATEGIES: hoisted.DEFAULT_STRATEGIES,
  getStrategyNames: hoisted.getStrategyNames,
  validateStrategyOptions: hoisted.validateStrategyOptions,
}));

import { GlobalScheduler } from '../global-scheduler.mycelia.js';

describe('GlobalScheduler', () => {
  let messageSystem;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    messageSystem = {
      getSubsystems: vi.fn().mockReturnValue([]),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts and stops scheduling loop', () => {
    const scheduler = new GlobalScheduler(messageSystem, { timeSliceDuration: 10 });
    scheduler.start();
    expect(scheduler.isRunning).toBe(true);
    vi.runOnlyPendingTimers();
    scheduler.stop();
    expect(scheduler.isRunning).toBe(false);
  });

  it('selects subsystems via strategy and allocates time slice', async () => {
    const scheduler = new GlobalScheduler(messageSystem, { timeSliceDuration: 5 });
    const subsystem = {
      name: 'svc',
      process: vi.fn().mockResolvedValue({ processed: 1 }),
      getQueueStatus: vi.fn().mockReturnValue({ size: 0 }),
      queue: { capacity: 10 },
      getStatistics: vi.fn().mockReturnValue({ processed: 5 }),
    };
    messageSystem.getSubsystems.mockReturnValue([subsystem]);

    scheduler.isRunning = true;
    await scheduler.scheduleNext();
    expect(subsystem.process).toHaveBeenCalled();
    expect(scheduler.stats.subsystemsScheduled).toBe(1);
  });

  it('registers strategies and validates setStrategy', () => {
    const scheduler = new GlobalScheduler(messageSystem);
    const customStrategy = vi.fn((subs) => subs[0]);
    scheduler.registerStrategy('custom', customStrategy);
    expect(scheduler.getAvailableStrategies()).toContain('custom');
    scheduler.setStrategy('custom', { foo: true });
    expect(hoisted.validateStrategyOptions).toHaveBeenCalledWith('custom', { foo: true });
    expect(() => scheduler.unregisterStrategy('round-robin')).toThrow();
    expect(scheduler.unregisterStrategy('custom')).toBe(true);
  });

  it('provides statistics and subsystem stats', () => {
    const scheduler = new GlobalScheduler(messageSystem);
    messageSystem.getSubsystems.mockReturnValue([
      {
        name: 'svc',
        getQueueStatus: () => ({ size: 0 }),
        queue: { capacity: 10 },
        getStatistics: () => ({ processed: 5 }),
      },
    ]);
    const stats = scheduler.getStatistics();
    expect(stats.subsystemCount).toBe(1);
    const subsystemStats = scheduler.getSubsystemStatistics();
    expect(subsystemStats.svc.processed).toBe(5);
  });

  it('resets state on clear', () => {
    const scheduler = new GlobalScheduler(messageSystem);
    scheduler.stats.subsystemsScheduled = 10;
    scheduler.clear();
    expect(scheduler.stats.subsystemsScheduled).toBe(0);
    expect(scheduler.currentSubsystemIndex).toBe(0);
  });
});

