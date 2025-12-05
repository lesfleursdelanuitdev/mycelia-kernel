/**
 * useBase Factory Function
 * 
 * Factory function to create a new BaseSubsystem instance with a fluent API.
 * 
 * @param {string} name - Unique name for the subsystem
 * @param {Object} [options={}] - Configuration options
 * @returns {BaseSubsystem} New BaseSubsystem instance
 * 
 * @example
 * const subsystem = useBase('canvas', { debug: true })
 *   .use(useSecurity)
 *   .use(useQueue)
 *   .use(useScheduler)
 *   .use(useRouter)
 *   .use(useMessageProcessor)
 *   .use(useStatistics)
 *   .injectContext({ ms: messageSystem })
 *   .build();
 * 
 * @example
 * // With initialization callback
 * const subsystem = useBase('server')
 *   .use(useSecurity)
 *   .use(useQueue)
 *   .onInit((api, ctx) => {
 *     console.log('Server subsystem ready:', api.name);
 *   })
 *   .injectContext({ ms: messageSystem })
 *   .build();
 */
import { BaseSubsystem } from './models/base-subsystem/base.subsystem.mycelia.js';

export function useBase(name, options = {}) {
  return new BaseSubsystem(name, options);
}

