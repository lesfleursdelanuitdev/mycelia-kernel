import { useHierarchy } from '../../hooks/hierarchy/use-hierarchy.mycelia.js';
import { useRouter } from '../../hooks/router/use-router.mycelia.js';
import { useMessageProcessor } from '../../hooks/message-processor/use-message-processor.mycelia.js';
import { useQueue } from '../../hooks/queue/use-queue.mycelia.js';
import { useScheduler } from '../../hooks/scheduler/use-scheduler.mycelia.js';
import { useListeners } from '../../hooks/listeners/use-listeners.mycelia.js';
import { useStatistics } from '../../hooks/statistics/use-statistics.mycelia.js';
import { useSynchronous } from '../../hooks/synchronous/use-synchronous.mycelia.js';
import { useQueries } from '../../hooks/queries/use-queries.mycelia.js';
import { useMessages } from '../../hooks/messages/use-messages.mycelia.js';
import { useRequests } from '../../hooks/requests/use-requests.mycelia.js';
import { useChannels } from '../../hooks/channels/use-channels.mycelia.js';
import { useCommands } from '../../hooks/commands/use-commands.mycelia.js';
import { useResponses } from '../../hooks/responses/use-responses.mycelia.js';

/**
 * DefaultHooks
 * Lightweight wrapper for managing an ordered list of hooks.
 * Actual dependency order is resolved at build time (via topo-sort).
 */
export class DefaultHooks {
  #hooks;

  constructor(hooks = []) {
    this.#hooks = Array.isArray(hooks) ? [...hooks] : [];
  }

  add(hook) {
    if (typeof hook !== 'function')
      throw new Error('DefaultHooks.add: hook must be a function');
    this.#hooks.push(hook);
    return this;
  }

  remove(hook) {
    const i = this.#hooks.indexOf(hook);
    if (i >= 0) this.#hooks.splice(i, 1);
    return this;
  }

  clear() {
    this.#hooks.length = 0;
    return this;
  }

  list() {
    return [...this.#hooks];
  }

  fork() {
    return new DefaultHooks(this.#hooks);
  }
}

/**
 * Canonical baseline defaults.
 * General-purpose defaults for most asynchronous subsystems.
 */
export function createCanonicalDefaultHooks() {
  return new DefaultHooks([
    useHierarchy,
    useRouter,
    useMessages,
    useRequests,
    useChannels,
    useCommands,
    useResponses,
    useMessageProcessor,
    useQueue,
    useScheduler,
    useListeners,
    useStatistics,
    useQueries, 
  ]);
}

/**
 * Synchronous defaults (for kernel-like subsystems).
 * Replaces useCore + queue/scheduler with useSynchronous.
 */
export function createSynchronousDefaultHooks() {
  return new DefaultHooks([
    useListeners,
    useStatistics,
    useQueries, 
    useRouter,
    useMessages,
    useRequests,
    useChannels,
    useCommands,
    useResponses,
    useQueue, 
    useMessageProcessor,
    useSynchronous,
    useHierarchy,
  ]);
}

/**
 * FACET_KINDS
 * 
 * Constants mapping for facet kind identifiers used in default hooks.
 * These constants should be used instead of string literals throughout the system
 * to ensure type safety and prevent typos.
 */
export const FACET_KINDS = {
  HIERARCHY: 'hierarchy',
  ROUTER: 'router',
  PROCESSOR: 'processor',
  QUEUE: 'queue',
  SCHEDULER: 'scheduler',
  LISTENERS: 'listeners',
  STATISTICS: 'statistics',
  SYNCHRONOUS: 'synchronous',
  QUERIES: 'queries',
  MESSAGES: 'messages',
  REQUESTS: 'requests',
  CHANNELS: 'channels',
  COMMANDS: 'commands',
  RESPONSES: 'responses',
};
