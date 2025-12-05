/**
 * Health Aggregator Utilities
 * 
 * Utilities for aggregating health status from multiple subsystems.
 */

import { HealthStatus } from './health-status.mycelia.js';

/**
 * Get health status for a single subsystem
 * 
 * @param {BaseSubsystem} subsystem - Subsystem instance
 * @returns {Promise<HealthStatus>} Health status
 */
export async function getSubsystemHealth(subsystem) {
  const healthCheckFacet = subsystem.find('healthCheck');
  
  if (healthCheckFacet) {
    try {
      return await healthCheckFacet.getHealth();
    } catch (error) {
      return new HealthStatus('unhealthy', {
        subsystem: subsystem.name,
        message: `Health check failed: ${error.message}`,
        metadata: { error: error.name }
      });
    }
  }

  // If no health check facet, create a basic health status
  return new HealthStatus('healthy', {
    subsystem: subsystem.name,
    message: 'No health check configured',
    metadata: {
      built: subsystem.isBuilt()
    }
  });
}

/**
 * Get aggregated health status for all subsystems in a MessageSystem
 * 
 * @param {MessageSystem} messageSystem - MessageSystem instance
 * @param {Object} [options={}] - Options
 * @param {string} [options.systemName] - System name
 * @param {Array<string>} [options.excludeSubsystems=[]] - Subsystem names to exclude
 * @returns {Promise<HealthStatus>} Aggregated health status
 */
export async function getSystemHealth(messageSystem, options = {}) {
  const { systemName = 'system', excludeSubsystems = [] } = options;

  // Get all subsystems from MessageSystem
  const registryFacet = messageSystem.find('messageSystemRegistry');
  if (!registryFacet) {
    return new HealthStatus('unhealthy', {
      subsystem: systemName,
      message: 'MessageSystem registry not found',
      metadata: {}
    });
  }

  const subsystems = registryFacet.values();
  const healthStatuses = [];

  // Get health for each subsystem (excluding specified ones)
  for (const subsystem of subsystems) {
    if (excludeSubsystems.includes(subsystem.name)) {
      continue;
    }

    try {
      const health = await getSubsystemHealth(subsystem);
      healthStatuses.push(health);
    } catch (error) {
      // If we can't get health for a subsystem, mark it as unhealthy
      healthStatuses.push(new HealthStatus('unhealthy', {
        subsystem: subsystem.name,
        message: `Failed to get health: ${error.message}`,
        metadata: { error: error.name }
      }));
    }
  }

  // Merge all health statuses
  return HealthStatus.merge(healthStatuses, {
    systemName,
    message: `System health aggregated from ${healthStatuses.length} subsystems`
  });
}

/**
 * Get readiness status (whether system is ready to accept traffic)
 * 
 * @param {MessageSystem} messageSystem - MessageSystem instance
 * @param {Object} [options={}] - Options
 * @returns {Promise<HealthStatus>} Readiness status
 */
export async function getReadinessStatus(messageSystem, options = {}) {
  const systemHealth = await getSystemHealth(messageSystem, options);
  
  // Readiness requires all subsystems to be healthy or degraded (not unhealthy)
  const isReady = !systemHealth.isUnhealthy();
  
  return new HealthStatus(isReady ? 'healthy' : 'unhealthy', {
    subsystem: options.systemName || 'system',
    checks: systemHealth.checks,
    message: isReady ? 'System is ready' : 'System is not ready',
    metadata: {
      ...systemHealth.metadata,
      readiness: isReady
    }
  });
}

/**
 * Get liveness status (whether system is alive)
 * 
 * @param {MessageSystem} messageSystem - MessageSystem instance
 * @param {Object} [options={}] - Options
 * @returns {Promise<HealthStatus>} Liveness status
 */
export async function getLivenessStatus(messageSystem, options = {}) {
  // Liveness is simpler - just check if MessageSystem is operational
  const registryFacet = messageSystem.find('messageSystemRegistry');
  const isAlive = registryFacet !== null && messageSystem.isBuilt();

  return new HealthStatus(isAlive ? 'healthy' : 'unhealthy', {
    subsystem: options.systemName || 'system',
    message: isAlive ? 'System is alive' : 'System is not alive',
    metadata: {
      built: messageSystem.isBuilt(),
      registryAvailable: registryFacet !== null
    }
  });
}




