import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSubsystemHealth, getSystemHealth, getReadinessStatus, getLivenessStatus } from '../health-aggregator.utils.mycelia.js';
import { HealthStatus } from '../health-status.mycelia.js';

describe('Health Aggregator Utils', () => {
  let mockMessageSystem;
  let mockRegistry;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegistry = {
      values: vi.fn().mockReturnValue([])
    };

    mockMessageSystem = {
      name: 'test-system',
      isBuilt: vi.fn().mockReturnValue(true),
      find: vi.fn((kind) => {
        if (kind === 'messageSystemRegistry') {
          return mockRegistry;
        }
        return null;
      })
    };
  });

  describe('getSubsystemHealth', () => {
    it('returns health from healthCheck facet if available', async () => {
      const mockHealth = new HealthStatus('healthy', {
        subsystem: 'test-subsystem',
        message: 'All good'
      });

      const mockSubsystem = {
        name: 'test-subsystem',
        find: vi.fn((kind) => {
          if (kind === 'healthCheck') {
            return {
              getHealth: vi.fn().mockResolvedValue(mockHealth)
            };
          }
          return null;
        })
      };

      const health = await getSubsystemHealth(mockSubsystem);
      expect(health).toBe(mockHealth);
    });

    it('returns basic health status if no healthCheck facet', async () => {
      const mockSubsystem = {
        name: 'test-subsystem',
        isBuilt: vi.fn().mockReturnValue(true),
        find: vi.fn().mockReturnValue(null)
      };

      const health = await getSubsystemHealth(mockSubsystem);
      expect(health).toBeInstanceOf(HealthStatus);
      expect(health.status).toBe('healthy');
      expect(health.subsystem).toBe('test-subsystem');
    });

    it('handles health check errors gracefully', async () => {
      const mockSubsystem = {
        name: 'test-subsystem',
        find: vi.fn((kind) => {
          if (kind === 'healthCheck') {
            return {
              getHealth: vi.fn().mockRejectedValue(new Error('Health check failed'))
            };
          }
          return null;
        })
      };

      const health = await getSubsystemHealth(mockSubsystem);
      expect(health).toBeInstanceOf(HealthStatus);
      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('Health check failed');
    });
  });

  describe('getSystemHealth', () => {
    it('returns aggregated health from all subsystems', async () => {
      const subsystem1 = {
        name: 'sub1',
        find: vi.fn().mockReturnValue(null),
        isBuilt: vi.fn().mockReturnValue(true)
      };
      const subsystem2 = {
        name: 'sub2',
        find: vi.fn().mockReturnValue(null),
        isBuilt: vi.fn().mockReturnValue(true)
      };

      mockRegistry.values.mockReturnValue([subsystem1, subsystem2]);

      const health = await getSystemHealth(mockMessageSystem, {
        systemName: 'test-system'
      });
      expect(health).toBeInstanceOf(HealthStatus);
      expect(health.subsystem).toBe('test-system');
      expect(health.metadata.subsystemCount).toBe(2);
    });

    it('excludes specified subsystems', async () => {
      const subsystem1 = {
        name: 'sub1',
        find: vi.fn().mockReturnValue(null),
        isBuilt: vi.fn().mockReturnValue(true)
      };
      const subsystem2 = {
        name: 'sub2',
        find: vi.fn().mockReturnValue(null),
        isBuilt: vi.fn().mockReturnValue(true)
      };

      mockRegistry.values.mockReturnValue([subsystem1, subsystem2]);

      const health = await getSystemHealth(mockMessageSystem, {
        excludeSubsystems: ['sub2']
      });
      expect(health.metadata.subsystemCount).toBe(1);
    });

    it('returns unhealthy if registry not found', async () => {
      mockMessageSystem.find.mockReturnValue(null);

      const health = await getSystemHealth(mockMessageSystem);
      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('registry not found');
    });

    it('handles subsystem health check errors', async () => {
      const subsystem1 = {
        name: 'sub1',
        find: vi.fn((kind) => {
          if (kind === 'healthCheck') {
            return {
              getHealth: vi.fn().mockRejectedValue(new Error('Failed'))
            };
          }
          return null;
        })
      };

      mockRegistry.values.mockReturnValue([subsystem1]);

      const health = await getSystemHealth(mockMessageSystem);
      expect(health.metadata.unhealthyCount).toBeGreaterThan(0);
    });
  });

  describe('getReadinessStatus', () => {
    it('returns healthy if system is ready', async () => {
      const subsystem1 = {
        name: 'sub1',
        find: vi.fn().mockReturnValue(null),
        isBuilt: vi.fn().mockReturnValue(true)
      };

      mockRegistry.values.mockReturnValue([subsystem1]);

      const readiness = await getReadinessStatus(mockMessageSystem);
      expect(readiness.status).toBe('healthy');
      expect(readiness.metadata.readiness).toBe(true);
    });

    it('returns unhealthy if system is not ready', async () => {
      const subsystem1 = {
        name: 'sub1',
        find: vi.fn((kind) => {
          if (kind === 'healthCheck') {
            return {
              getHealth: vi.fn().mockResolvedValue(
                new HealthStatus('unhealthy', { subsystem: 'sub1' })
              )
            };
          }
          return null;
        })
      };

      mockRegistry.values.mockReturnValue([subsystem1]);

      const readiness = await getReadinessStatus(mockMessageSystem);
      expect(readiness.status).toBe('unhealthy');
      expect(readiness.metadata.readiness).toBe(false);
    });
  });

  describe('getLivenessStatus', () => {
    it('returns healthy if system is alive', async () => {
      const liveness = await getLivenessStatus(mockMessageSystem);
      expect(liveness.status).toBe('healthy');
      expect(liveness.metadata.built).toBe(true);
      expect(liveness.metadata.registryAvailable).toBe(true);
    });

    it('returns unhealthy if system is not built', async () => {
      mockMessageSystem.isBuilt.mockReturnValue(false);

      const liveness = await getLivenessStatus(mockMessageSystem);
      expect(liveness.status).toBe('unhealthy');
      expect(liveness.metadata.built).toBe(false);
    });

    it('returns unhealthy if registry not available', async () => {
      mockMessageSystem.find.mockReturnValue(null);

      const liveness = await getLivenessStatus(mockMessageSystem);
      expect(liveness.status).toBe('unhealthy');
      expect(liveness.metadata.registryAvailable).toBe(false);
    });
  });
});

