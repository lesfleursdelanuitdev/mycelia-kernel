import { describe, it, expect } from 'vitest';
import {
  DefaultHooks,
  createCanonicalDefaultHooks,
  createSynchronousDefaultHooks,
  FACET_KINDS,
} from '../default-hooks.mycelia.js';
import { useHierarchy } from '../../../hooks/hierarchy/use-hierarchy.mycelia.js';
import { useRouter } from '../../../hooks/router/use-router.mycelia.js';
import { useMessages } from '../../../hooks/messages/use-messages.mycelia.js';
import { useRequests } from '../../../hooks/requests/use-requests.mycelia.js';
import { useChannels } from '../../../hooks/channels/use-channels.mycelia.js';
import { useCommands } from '../../../hooks/commands/use-commands.mycelia.js';
import { useResponses } from '../../../hooks/responses/use-responses.mycelia.js';
import { useMessageProcessor } from '../../../hooks/message-processor/use-message-processor.mycelia.js';
import { useQueue } from '../../../hooks/queue/use-queue.mycelia.js';
import { useScheduler } from '../../../hooks/scheduler/use-scheduler.mycelia.js';
import { useListeners } from '../../../hooks/listeners/use-listeners.mycelia.js';
import { useStatistics } from '../../../hooks/statistics/use-statistics.mycelia.js';
import { useQueries } from '../../../hooks/queries/use-queries.mycelia.js';
import { useSynchronous } from '../../../hooks/synchronous/use-synchronous.mycelia.js';

describe('DefaultHooks class', () => {
  it('add/remove/clear/list operations', () => {
    const hookA = () => {};
    const hookB = () => {};

    const defaults = new DefaultHooks([hookA]);
    expect(defaults.list()).toEqual([hookA]);

    // Ensure constructor copies input array
    const original = [hookA];
    const copy = new DefaultHooks(original);
    original.push(hookB);
    expect(copy.list()).toEqual([hookA]);

    defaults.add(hookB);
    expect(defaults.list()).toEqual([hookA, hookB]);

    defaults.remove(hookA);
    expect(defaults.list()).toEqual([hookB]);

    defaults.clear();
    expect(defaults.list()).toEqual([]);
  });

  it('fork produces independent copy', () => {
    const hook = () => {};
    const defaults = new DefaultHooks([hook]);
    const forked = defaults.fork();

    expect(forked).not.toBe(defaults);
    expect(forked.list()).toEqual([hook]);

    forked.add(() => {});
    expect(defaults.list()).toEqual([hook]);
  });

  it('add rejects non-functions', () => {
    const defaults = new DefaultHooks();
    expect(() => defaults.add(null)).toThrow(/function/);
  });
});

describe('canonical default hook factories', () => {
  it('createCanonicalDefaultHooks returns expected order', () => {
    const canonical = createCanonicalDefaultHooks().list();
    expect(canonical).toEqual([
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
  });

  it('createSynchronousDefaultHooks returns expected order', () => {
    const sync = createSynchronousDefaultHooks().list();
    expect(sync).toEqual([
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
  });
});

describe('FACET_KINDS constant', () => {
  it('exposes all expected keys', () => {
    expect(FACET_KINDS).toEqual({
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
    });
  });
});

