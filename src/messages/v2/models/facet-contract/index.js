/**
 * Facet Contract Registry Index
 * 
 * Creates a default FacetContractRegistry instance and registers all available
 * facet contracts. This provides a centralized registry for enforcing contracts
 * on facets throughout the system.
 * 
 * @example
 * import { defaultContractRegistry } from './index.js';
 * 
 * // Enforce a contract on a facet
 * defaultContractRegistry.enforce('router', ctx, api, subsystem, routerFacet);
 * 
 * // Check if a contract exists
 * if (defaultContractRegistry.has('queue')) {
 *   // Contract is available
 * }
 */
import { FacetContractRegistry } from './facet-contract-registry.mycelia.js';
import { routerContract } from './router.contract.mycelia.js';
import { queueContract } from './queue.contract.mycelia.js';
import { processorContract } from './processor.contract.mycelia.js';
import { listenersContract } from './listeners.contract.mycelia.js';
import { hierarchyContract } from './hierarchy.contract.mycelia.js';
import { schedulerContract } from './scheduler.contract.mycelia.js';
import { serverContract } from './server.contract.mycelia.js';
import { websocketContract } from './websocket.contract.mycelia.js';
import { storageContract } from './storage.contract.mycelia.js';

/**
 * Default Facet Contract Registry
 * 
 * Pre-configured registry with all standard facet contracts registered.
 */
export const defaultContractRegistry = new FacetContractRegistry();

// Register all available contracts
defaultContractRegistry.register(routerContract);
defaultContractRegistry.register(queueContract);
defaultContractRegistry.register(processorContract);
defaultContractRegistry.register(listenersContract);
defaultContractRegistry.register(hierarchyContract);
defaultContractRegistry.register(schedulerContract);
defaultContractRegistry.register(serverContract);
defaultContractRegistry.register(websocketContract);
defaultContractRegistry.register(storageContract);

// Also export the registry class and individual contracts for flexibility
export { FacetContractRegistry } from './facet-contract-registry.mycelia.js';
export { FacetContract, createFacetContract } from './facet-contract.mycelia.js';
export { routerContract } from './router.contract.mycelia.js';
export { queueContract } from './queue.contract.mycelia.js';
export { processorContract } from './processor.contract.mycelia.js';
export { listenersContract } from './listeners.contract.mycelia.js';
export { hierarchyContract } from './hierarchy.contract.mycelia.js';
export { schedulerContract } from './scheduler.contract.mycelia.js';
export { serverContract } from './server.contract.mycelia.js';
export { websocketContract } from './websocket.contract.mycelia.js';
export { storageContract } from './storage.contract.mycelia.js';

