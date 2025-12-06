import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useHealthCheck } from '../health/use-health-check.mycelia.js';
import { HealthStatus } from '../../models/health/health-status.mycelia.js';

const createHealthCheckFacet = ({ config = {}, subsystem = {} } = {}) => {
  const ctx = { config: { healthCheck: config } };
  const api = { name: 'test-subsystem' };
  const mockSubsystem = {
    name: 'test-subsystem',
    isBuilt: vi.fn().mockReturnValue(true),
    find: vi.fn((kind) => {
      if (kind === 'statistics') {
        return {
          getStatistics: vi.fn().mockReturnValue({
            messagesAccepted: 100,
            messagesProcessed: 95,
            processingErrors: 2,
            queueFullEvents: 0,
            timeSlicesReceived: 10
          })
        };
      }
      if (kind === 'queue') {
        return {
          queue: { capacity: 100 },
          getQueueStatus: vi.fn().mockReturnValue({ size: 45 })
        };
      }
      return null;
    }),
    ...subsystem
  };
  return { facet: useHealthCheck(ctx, api, mockSubsystem), subsystem: mockSubsystem };
};

describe('useHealthCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates health check facet', () => {
    const { facet } = createHealthCheckFacet();
    expect(facet).toBeDefined();
    expect(facet.getHealth).toBeDefined();
    expect(facet.registerCheck).toBeDefined();
    expect(facet.unregisterCheck).toBeDefined();
    expect(facet.getRegisteredChecks).toBeDefined();
  });

  it('performs default health checks when no custom checks registered', async () => {
    const { facet } = createHealthCheckFacet();
    const health = await facet.getHealth();
    
    expect(health).toBeInstanceOf(HealthStatus);
    expect(health.subsystem).toBe('test-subsystem');
    expect(health.status).toBe('healthy');
    expect(health.checks).toHaveProperty('built');
    expect(health.checks).toHaveProperty('statistics');
    expect(health.checks).toHaveProperty('queue');
  });

  it('returns unhealthy status when subsystem is not built', async () => {
    const { facet, subsystem } = createHealthCheckFacet();
    subsystem.isBuilt.mockReturnValue(false);
    
    const health = await facet.getHealth();
    expect(health.checks.built.status).toBe('unhealthy');
  });

  it('returns degraded status when error rate is high', async () => {
    const { facet, subsystem } = createHealthCheckFacet();
    subsystem.find.mockImplementation((kind) => {
      if (kind === 'statistics') {
        return {
          getStatistics: vi.fn().mockReturnValue({
            messagesAccepted: 100,
            messagesProcessed: 90,
            processingErrors: 8, // 8% error rate
            queueFullEvents: 0,
            timeSlicesReceived: 10
          })
        };
      }
      return null;
    });
    
    const health = await facet.getHealth();
    expect(health.checks.statistics.status).toBe('degraded');
  });

  it('returns unhealthy status when error rate is very high', async () => {
    const { facet, subsystem } = createHealthCheckFacet();
    subsystem.find.mockImplementation((kind) => {
      if (kind === 'statistics') {
        return {
          getStatistics: vi.fn().mockReturnValue({
            messagesAccepted: 100,
            messagesProcessed: 85,
            processingErrors: 15, // 15% error rate
            queueFullEvents: 0,
            timeSlicesReceived: 10
          })
        };
      }
      return null;
    });
    
    const health = await facet.getHealth();
    expect(health.checks.statistics.status).toBe('unhealthy');
  });

  it('returns degraded status when queue is nearly full', async () => {
    const { facet, subsystem } = createHealthCheckFacet();
    subsystem.find.mockImplementation((kind) => {
      if (kind === 'queue') {
        return {
          queue: { capacity: 100 },
          getQueueStatus: vi.fn().mockReturnValue({ size: 85 }) // 85% full
        };
      }
      return null;
    });
    
    const health = await facet.getHealth();
    expect(health.checks.queue.status).toBe('degraded');
  });

  it('returns unhealthy status when queue is full', async () => {
    const { facet, subsystem } = createHealthCheckFacet();
    subsystem.find.mockImplementation((kind) => {
      if (kind === 'queue') {
        return {
          queue: { capacity: 100 },
          getQueueStatus: vi.fn().mockReturnValue({ size: 100 }) // 100% full
        };
      }
      return null;
    });
    
    const health = await facet.getHealth();
    expect(health.checks.queue.status).toBe('unhealthy');
  });

  it('registers and runs custom health checks', async () => {
    const { facet } = createHealthCheckFacet();
    const customCheck = vi.fn().mockResolvedValue({
      status: 'healthy',
      message: 'Custom check passed'
    });
    
    facet.registerCheck('custom', customCheck);
    const health = await facet.getHealth();
    
    expect(customCheck).toHaveBeenCalled();
    expect(health.checks).toHaveProperty('custom');
    expect(health.checks.custom.status).toBe('healthy');
  });

  it('handles custom health check errors gracefully', async () => {
    const { facet } = createHealthCheckFacet();
    const failingCheck = vi.fn().mockRejectedValue(new Error('Check failed'));
    
    facet.registerCheck('failing', failingCheck);
    const health = await facet.getHealth();
    
    expect(failingCheck).toHaveBeenCalled();
    expect(health.checks.failing.status).toBe('unhealthy');
    expect(health.checks.failing.message).toContain('Check failed');
  });

  it('supports custom health check returning HealthStatus', async () => {
    const { facet } = createHealthCheckFacet();
    const customStatus = new HealthStatus('degraded', {
      subsystem: 'test-subsystem',
      message: 'Custom status'
    });
    const customCheck = vi.fn().mockResolvedValue(customStatus);
    
    facet.registerCheck('custom', customCheck);
    const health = await facet.getHealth();
    
    expect(health.checks.custom.status).toBe('degraded');
    expect(health.checks.custom.message).toBe('Custom status');
  });

  it('supports custom health check returning boolean', async () => {
    const { facet } = createHealthCheckFacet();
    const customCheck = vi.fn().mockResolvedValue(false);
    
    facet.registerCheck('custom', customCheck);
    const health = await facet.getHealth();
    
    expect(health.checks.custom.status).toBe('unhealthy');
  });

  it('unregisters health checks', () => {
    const { facet } = createHealthCheckFacet();
    const customCheck = vi.fn();
    
    facet.registerCheck('custom', customCheck);
    expect(facet.getRegisteredChecks()).toContain('custom');
    
    const removed = facet.unregisterCheck('custom');
    expect(removed).toBe(true);
    expect(facet.getRegisteredChecks()).not.toContain('custom');
  });

  it('returns false when unregistering non-existent check', () => {
    const { facet } = createHealthCheckFacet();
    const removed = facet.unregisterCheck('nonexistent');
    expect(removed).toBe(false);
  });

  it('updates overall status based on check results', async () => {
    const { facet } = createHealthCheckFacet();
    const unhealthyCheck = vi.fn().mockResolvedValue({ status: 'unhealthy', message: 'Failed' });
    
    facet.registerCheck('unhealthy', unhealthyCheck);
    const health = await facet.getHealth();
    
    expect(health.status).toBe('unhealthy');
  });

  it('prioritizes unhealthy over degraded status', async () => {
    const { facet } = createHealthCheckFacet();
    const degradedCheck = vi.fn().mockResolvedValue({ status: 'degraded', message: 'Degraded' });
    const unhealthyCheck = vi.fn().mockResolvedValue({ status: 'unhealthy', message: 'Unhealthy' });
    
    facet.registerCheck('degraded', degradedCheck);
    facet.registerCheck('unhealthy', unhealthyCheck);
    const health = await facet.getHealth();
    
    expect(health.status).toBe('unhealthy');
  });
});





