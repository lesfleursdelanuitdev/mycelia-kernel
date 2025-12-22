/**
 * StandalonePluginSystem (Re-export from mycelia-kernel-plugin)
 * 
 * Re-exports StandalonePluginSystem from the plugin system package.
 * The plugin system's version already provides no-op implementations for
 * message processing methods, making it suitable for standalone use.
 * 
 * This class is ideal for:
 * - Plugin architectures
 * - Modular applications
 * - Component systems
 * - Service containers
 * 
 * @example
 * ```javascript
 * import { StandalonePluginSystem } from './standalone-plugin-system.mycelia.js';
 * import { useDatabase } from './plugins/use-database.mycelia.js';
 * 
 * const system = new StandalonePluginSystem('my-app', {
 *   config: {
 *     database: { host: 'localhost' }
 *   }
 * });
 * 
 * system
 *   .use(useDatabase)
 *   .build();
 * 
 * const db = system.find('database');
 * ```
 */
export { StandalonePluginSystem } from 'mycelia-kernel-plugin/system';

