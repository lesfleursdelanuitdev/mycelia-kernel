import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../statistics/subsystem-statistics.mycelia.js', () => ({
  SubsystemStatistics: vi.fn().mockImplementation(() => ({
    getStats: vi.fn().mockReturnValue({
      messagesAccepted: 1,
      messagesProcessed: 2,
      processingErrors: 0,
      queueFullEvents: 1,
      timeSlicesReceived: 3,
    }),
    getAverageProcessingTime: vi.fn().mockReturnValue(4.5),
  })),
}));

import { SubsystemStatistics } from '../statistics/subsystem-statistics.mycelia.js';
import { useStatistics } from '../statistics/use-statistics.mycelia.js';

const createStatisticsFacet = ({ config = {} } = {}) => {
  const ctx = { config: { statistics: config } };
  const api = { name: 'canvas' };
  return useStatistics(ctx, api, {});
};

describe('useStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates SubsystemStatistics with debug flag', () => {
    createStatisticsFacet({ config: { debug: true } });
    expect(SubsystemStatistics).toHaveBeenCalledWith(true);
  });

  it('exposes getStatistics and getProcessingMetrics', () => {
    const facet = createStatisticsFacet();
    const statsInstance = SubsystemStatistics.mock.results.at(-1).value;

    expect(facet.getStatistics()).toEqual({
      messagesAccepted: 1,
      messagesProcessed: 2,
      processingErrors: 0,
      queueFullEvents: 1,
      timeSlicesReceived: 3,
    });
    expect(statsInstance.getStats).toHaveBeenCalled();

    expect(facet.getProcessingMetrics()).toEqual({
      messagesAccepted: 1,
      messagesProcessed: 2,
      averageProcessingTime: 4.5,
      processingErrors: 0,
      queueFullEvents: 1,
      timeSlicesReceived: 3,
    });
  });
});

