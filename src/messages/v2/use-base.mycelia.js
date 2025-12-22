/**
 * useBase Factory Function
 * 
 * Factory function to create a new BaseSubsystem instance with a fluent API.
 * 
 * @param {string} name - Unique name for the subsystem
 * @param {Object} [options={}] - Configuration options
 * @param {Object} options.ms - MessageSystem instance (required for mycelia-kernel)
 * @returns {BaseSubsystem} New BaseSubsystem instance
 * 
 * @example
 * const subsystem = useBase('canvas', { ms: messageSystem, debug: true })
 *   .use(useSecurity)
 *   .use(useQueue)
 *   .use(useScheduler)
 *   .use(useRouter)
 *   .use(useMessageProcessor)
 *   .use(useStatistics)
 *   .build();
 * 
 * @example
 * // With initialization callback
 * const subsystem = useBase('server', { ms: messageSystem })
 *   .use(useSecurity)
 *   .use(useQueue)
 *   .onInit((api, ctx) => {
 *     console.log('Server subsystem ready:', api.name);
 *   })
 *   .build();
 */
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';

export function useBase(name, options = {}) {
  // BaseSubsystem constructor will enforce ms requirement
  return new BaseSubsystem(name, options);
}

