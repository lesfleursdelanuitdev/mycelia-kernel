import { describe, it, expect } from 'vitest';
import { HealthStatus } from '../health-status.mycelia.js';

describe('HealthStatus', () => {
  it('creates health status with valid status', () => {
    const health = new HealthStatus('healthy', {
      subsystem: 'test-subsystem',
      message: 'All systems operational'
    });
    
    expect(health.status).toBe('healthy');
    expect(health.subsystem).toBe('test-subsystem');
    expect(health.message).toBe('All systems operational');
  });

  it('throws error for invalid status', () => {
    expect(() => new HealthStatus('invalid')).toThrow(/Invalid status/);
  });

  it('provides status check methods', () => {
    const healthy = new HealthStatus('healthy');
    const degraded = new HealthStatus('degraded');
    const unhealthy = new HealthStatus('unhealthy');
    
    expect(healthy.isHealthy()).toBe(true);
    expect(healthy.isDegraded()).toBe(false);
    expect(healthy.isUnhealthy()).toBe(false);
    
    expect(degraded.isHealthy()).toBe(false);
    expect(degraded.isDegraded()).toBe(true);
    expect(degraded.isUnhealthy()).toBe(false);
    
    expect(unhealthy.isHealthy()).toBe(false);
    expect(unhealthy.isDegraded()).toBe(false);
    expect(unhealthy.isUnhealthy()).toBe(true);
  });

  it('adds health checks', () => {
    const health = new HealthStatus('healthy', { subsystem: 'test' });
    
    health.addCheck('database', 'healthy', 'Database connected');
    health.addCheck('cache', 'degraded', 'Cache slow', { latency: 500 });
    
    expect(health.checks).toHaveProperty('database');
    expect(health.checks.database.status).toBe('healthy');
    expect(health.checks.database.message).toBe('Database connected');
    
    expect(health.checks).toHaveProperty('cache');
    expect(health.checks.cache.status).toBe('degraded');
    expect(health.checks.cache.metadata.latency).toBe(500);
  });

  it('updates overall status based on checks', () => {
    const health = new HealthStatus('healthy', { subsystem: 'test' });
    
    health.addCheck('check1', 'healthy', 'OK');
    expect(health.status).toBe('healthy');
    
    health.addCheck('check2', 'degraded', 'Slow');
    expect(health.status).toBe('degraded');
    
    health.addCheck('check3', 'unhealthy', 'Failed');
    expect(health.status).toBe('unhealthy');
  });

  it('converts to JSON', () => {
    const health = new HealthStatus('healthy', {
      subsystem: 'test',
      message: 'OK',
      metadata: { version: '1.0' }
    });
    health.addCheck('db', 'healthy', 'Connected');
    
    const json = health.toJSON();
    expect(json).toEqual({
      status: 'healthy',
      subsystem: 'test',
      checks: {
        db: expect.objectContaining({
          status: 'healthy',
          message: 'Connected',
          timestamp: expect.any(Number)
        })
      },
      message: 'OK',
      metadata: { version: '1.0' },
      timestamp: expect.any(Number)
    });
  });

  it('creates from JSON', () => {
    const json = {
      status: 'degraded',
      subsystem: 'test',
      checks: {
        db: {
          status: 'degraded',
          message: 'Slow',
          metadata: {},
          timestamp: Date.now()
        }
      },
      message: 'Some issues',
      metadata: {},
      timestamp: Date.now()
    };
    
    const health = HealthStatus.fromJSON(json);
    expect(health.status).toBe('degraded');
    expect(health.subsystem).toBe('test');
    expect(health.checks).toHaveProperty('db');
  });

  it('merges multiple health statuses', () => {
    const status1 = new HealthStatus('healthy', { subsystem: 'sub1' });
    status1.addCheck('check1', 'healthy', 'OK');
    
    const status2 = new HealthStatus('degraded', { subsystem: 'sub2' });
    status2.addCheck('check2', 'degraded', 'Slow');
    
    const status3 = new HealthStatus('unhealthy', { subsystem: 'sub3' });
    status3.addCheck('check3', 'unhealthy', 'Failed');
    
    const merged = HealthStatus.merge([status1, status2, status3], {
      systemName: 'system'
    });
    
    expect(merged.status).toBe('unhealthy');
    expect(merged.subsystem).toBe('system');
    expect(merged.checks).toHaveProperty('sub1.check1');
    expect(merged.checks).toHaveProperty('sub2.check2');
    expect(merged.checks).toHaveProperty('sub3.check3');
    expect(merged.metadata.healthyCount).toBe(1);
    expect(merged.metadata.degradedCount).toBe(1);
    expect(merged.metadata.unhealthyCount).toBe(1);
  });

  it('handles empty array in merge', () => {
    const merged = HealthStatus.merge([], { systemName: 'system' });
    expect(merged.status).toBe('healthy');
    expect(merged.message).toContain('No subsystems');
  });

  it('prioritizes unhealthy over degraded in merge', () => {
    const healthy = new HealthStatus('healthy', { subsystem: 'sub1' });
    const degraded = new HealthStatus('degraded', { subsystem: 'sub2' });
    
    const merged = HealthStatus.merge([healthy, degraded], { systemName: 'system' });
    expect(merged.status).toBe('degraded');
  });
});





