import { useState } from 'react';
import { useScheduler } from '../hooks/scheduler/use-scheduler.mycelia.js';
import { SubsystemScheduler } from '../hooks/scheduler/subsystem-scheduler.mycelia.js';
import { useQueue } from '../hooks/queue/use-queue.mycelia.js';
import { useMessageProcessor } from '../hooks/message-processor/use-message-processor.mycelia.js';
import { useStatistics } from '../hooks/statistics/use-statistics.mycelia.js';
import { useQueries } from '../hooks/queries/use-queries.mycelia.js';
import { useRouter } from '../hooks/router/use-router.mycelia.js';

/**
 * UseSchedulerTest - React component test suite for useScheduler hook
 * Tests the useScheduler hook directly without building subsystems
 */
export function UseSchedulerTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create router facet
  const createRouterFacet = (config = {}) => {
    const subsystem = { name: 'test-subsystem' };
    const api = { name: 'test-subsystem' };
    const ctx = { config: { router: config } };
    return useRouter(ctx, api, subsystem);
  };

  // Helper to create statistics facet
  const createStatisticsFacet = (config = {}) => {
    const subsystem = { name: 'test-subsystem' };
    const api = { name: 'test-subsystem' };
    const ctx = { config: { statistics: config } };
    return useStatistics(ctx, api, subsystem);
  };

  // Helper to create queue facet
  const createQueueFacet = (config = {}) => {
    const subsystem = { name: 'test-subsystem' };
    const api = { name: 'test-subsystem' };
    const statisticsFacet = createStatisticsFacet();
    api.__facets = {
      find: (kind) => {
        if (kind === 'statistics') return statisticsFacet;
        return null;
      }
    };
    const ctx = { config: { queue: config } };
    return useQueue(ctx, api, subsystem);
  };

  // Helper to create queries facet
  const createQueriesFacet = (config = {}, routerFacet = null) => {
    const router = routerFacet || createRouterFacet();
    const subsystem = { 
      name: 'test-subsystem',
      registerRoute: (pattern, handler, options) => router.registerRoute(pattern, handler, options),
      unregisterRoute: (pattern) => router.unregisterRoute(pattern)
    };
    const api = { name: 'test-subsystem' };
    const ctx = { config: { queries: config } };
    return useQueries(ctx, api, subsystem);
  };

  // Helper to create processor facet
  const createProcessorFacet = (config = {}, queueFacetOverride = null) => {
    const routerFacet = createRouterFacet();
    const statisticsFacet = createStatisticsFacet();
    const queueFacet = queueFacetOverride || createQueueFacet();
    const queriesFacet = createQueriesFacet({}, routerFacet);
    
    const subsystem = { 
      name: 'test-subsystem',
      find: (kind) => {
        if (kind === 'queries') return queriesFacet;
        return null;
      }
    };
    const api = { name: 'test-subsystem' };
    
    api.__facets = {
      find: (kind) => {
        if (kind === 'router') return routerFacet;
        if (kind === 'statistics') return statisticsFacet;
        if (kind === 'queue') return queueFacet;
        return null;
      }
    };
    
    const ctx = { 
      config: { processor: config },
      ms: { sendError: async () => {} }
    };
    const processorFacet = useMessageProcessor(ctx, api, subsystem);
    
    processorFacet._routerFacet = routerFacet;
    processorFacet._statisticsFacet = statisticsFacet;
    processorFacet._queueFacet = queueFacet;
    processorFacet._queriesFacet = queriesFacet;
    
    return processorFacet;
  };

  // Helper to create scheduler facet
  const createSchedulerFacet = (config = {}) => {
    const routerFacet = createRouterFacet();
    const statisticsFacet = createStatisticsFacet();
    const queueFacet = createQueueFacet();
    const queriesFacet = createQueriesFacet({}, routerFacet);
    // Use the same queue facet for processor to ensure messages are enqueued in the same queue
    const processorFacet = createProcessorFacet({}, queueFacet);
    
    const subsystem = { 
      name: 'test-subsystem',
      find: (kind) => {
        if (kind === 'queue') return queueFacet;
        if (kind === 'processor') return processorFacet;
        if (kind === 'statistics') return statisticsFacet;
        if (kind === 'queries') return queriesFacet;
        return null;
      }
    };
    const api = { name: 'test-subsystem' };
    
    api.__facets = {
      find: (kind) => {
        if (kind === 'queue') return queueFacet;
        if (kind === 'processor') return processorFacet;
        if (kind === 'statistics') return statisticsFacet;
        if (kind === 'queries') return queriesFacet;
        return null;
      }
    };
    
    const ctx = { config: { scheduler: config } };
    const schedulerFacet = useScheduler(ctx, api, subsystem);
    
    // Attach facet references for test access
    schedulerFacet._queueFacet = queueFacet;
    schedulerFacet._processorFacet = processorFacet;
    schedulerFacet._statisticsFacet = statisticsFacet;
    schedulerFacet._queriesFacet = queriesFacet;
    schedulerFacet._routerFacet = routerFacet;
    
    return schedulerFacet;
  };

  // Helper to create a mock message
  const createMessage = (path, id = 'msg1', options = {}) => {
    const timestamp = options.timestamp || Date.now();
    const isAtomic = options.isAtomic || false;
    const message = {
      id,
      getId: () => id,
      getPath: () => path,
      getBody: () => ({}),
      isAtomic: () => isAtomic,
      getTimestamp: () => timestamp,
      isQuery: () => options.isQuery || false,
      setQueryResult: (result) => {
        // Store query result if needed
        message._queryResult = result;
      }
    };
    return message;
  };

  const testCases = [
    { name: 'Hook returns Facet', category: 'Initialization' },
    { name: 'Throws error if queue facet not found', category: 'Initialization' },
    { name: 'Records error if processor facet not found', category: 'Initialization' },
    { name: 'Works without statistics facet (graceful)', category: 'Initialization' },
    { name: 'Works without queries facet (graceful)', category: 'Initialization' },
    { name: 'Scheduler instance created immediately', category: 'Initialization' },
    { name: '_scheduler is SubsystemScheduler instance', category: 'Initialization' },
    { name: 'getScheduler() returns SubsystemScheduler instance', category: 'Initialization' },
    { name: 'process() - processes messages during time slice', category: 'process()' },
    { name: 'process() - returns correct result structure', category: 'process()' },
    { name: 'process() - returns paused status when paused', category: 'process()' },
    { name: 'process() - records time slice in statistics', category: 'process()' },
    { name: 'process() - handles empty queue', category: 'process()' },
    { name: 'pauseProcessing() - sets isPaused to true', category: 'Pause/Resume' },
    { name: 'resumeProcessing() - sets isPaused to false', category: 'Pause/Resume' },
    { name: 'isPaused() - returns correct state', category: 'Pause/Resume' },
    { name: 'isProcessing() - returns false initially', category: 'Processing State' },
    { name: 'isProcessing() - returns true when processing', category: 'Processing State' },
    { name: '_setProcessing() - sets processing state', category: 'Processing State' },
    { name: 'getPriority() - returns default priority', category: 'Priority' },
    { name: 'getPriority() - returns configured priority', category: 'Priority' },
    { name: 'setPriority() - sets priority correctly', category: 'Priority' },
    { name: 'setPriority() - throws error for negative numbers', category: 'Priority' },
    { name: 'setPriority() - throws error for non-numbers', category: 'Priority' },
    { name: 'configureScheduler() - configures strategy', category: 'Configuration' },
    { name: 'configureScheduler() - configures maxMessagesPerSlice', category: 'Configuration' },
    { name: 'Configuration - schedulingStrategy from config', category: 'Configuration' },
    { name: 'Configuration - maxMessagesPerSlice from config', category: 'Configuration' },
    { name: 'Configuration - priority from config', category: 'Configuration' },
    { name: 'Configuration - debug flag from config', category: 'Configuration' },
    { name: 'Configuration - default values', category: 'Configuration' },
    { name: 'Full workflow test', category: 'Integration' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        switch (testName) {
          case 'Hook returns Facet':
            result = testHookReturnsFacet();
            break;
          case 'Throws error if queue facet not found':
            result = await testMissingQueueFacet();
            break;
          case 'Records error if processor facet not found':
            result = await testMissingProcessorFacet();
            break;
          case 'Works without statistics facet (graceful)':
            result = await testMissingStatisticsFacet();
            break;
          case 'Works without queries facet (graceful)':
            result = await testMissingQueriesFacet();
            break;
          case 'Scheduler instance created immediately':
            result = testSchedulerCreated();
            break;
          case '_scheduler is SubsystemScheduler instance':
            result = testSchedulerType();
            break;
          case 'getScheduler() returns SubsystemScheduler instance':
            result = testGetScheduler();
            break;
          case 'process() - processes messages during time slice':
            result = await testProcessMessages();
            break;
          case 'process() - returns correct result structure':
            result = await testProcessResultStructure();
            break;
          case 'process() - returns paused status when paused':
            result = await testProcessPaused();
            break;
          case 'process() - records time slice in statistics':
            result = await testProcessRecordsTimeSlice();
            break;
          case 'process() - handles empty queue':
            result = await testProcessEmptyQueue();
            break;
          case 'pauseProcessing() - sets isPaused to true':
            result = testPauseProcessing();
            break;
          case 'resumeProcessing() - sets isPaused to false':
            result = testResumeProcessing();
            break;
          case 'isPaused() - returns correct state':
            result = testIsPaused();
            break;
          case 'isProcessing() - returns false initially':
            result = testIsProcessingFalse();
            break;
          case 'isProcessing() - returns true when processing':
            result = testIsProcessingTrue();
            break;
          case '_setProcessing() - sets processing state':
            result = testSetProcessing();
            break;
          case 'getPriority() - returns default priority':
            result = testGetPriorityDefault();
            break;
          case 'getPriority() - returns configured priority':
            result = testGetPriorityConfigured();
            break;
          case 'setPriority() - sets priority correctly':
            result = testSetPriority();
            break;
          case 'setPriority() - throws error for negative numbers':
            result = testSetPriorityNegative();
            break;
          case 'setPriority() - throws error for non-numbers':
            result = testSetPriorityNonNumber();
            break;
          case 'configureScheduler() - configures strategy':
            result = testConfigureSchedulerStrategy();
            break;
          case 'configureScheduler() - configures maxMessagesPerSlice':
            result = testConfigureSchedulerMaxMessages();
            break;
          case 'Configuration - schedulingStrategy from config':
            result = testConfigurationStrategy();
            break;
          case 'Configuration - maxMessagesPerSlice from config':
            result = testConfigurationMaxMessages();
            break;
          case 'Configuration - priority from config':
            result = testConfigurationPriority();
            break;
          case 'Configuration - debug flag from config':
            result = testConfigurationDebug();
            break;
          case 'Configuration - default values':
            result = testConfigurationDefaults();
            break;
          case 'Full workflow test':
            result = await testFullWorkflow();
            break;
          default:
            result = { success: false, error: 'Unknown test case' };
        }

        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          message: result.message,
          data: result.data,
          error: result.error
        }));
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: false,
          error: error.message,
          stack: error.stack
        }));
      } finally {
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testName);
          return next;
        });
      }
    }, 0);
  };

  const testHookReturnsFacet = () => {
    const facet = createSchedulerFacet();
    
    if (!facet || typeof facet !== 'object') {
      return { success: false, error: 'Hook should return an object' };
    }
    if (facet.getKind() !== 'scheduler') {
      return { success: false, error: `Facet kind should be 'scheduler', got '${facet.getKind()}'` };
    }
    
    return {
      success: true,
      message: 'Hook returns a Facet with correct kind',
      data: { kind: facet.getKind() }
    };
  };

  const testMissingQueueFacet = async () => {
    const subsystem = { name: 'test-subsystem', find: () => null };
    const api = { name: 'test-subsystem' };
    const processorFacet = createProcessorFacet();
    const statisticsFacet = createStatisticsFacet();
    const queriesFacet = createQueriesFacet();
    
    api.__facets = {
      find: (kind) => {
        if (kind === 'processor') return processorFacet;
        if (kind === 'statistics') return statisticsFacet;
        if (kind === 'queries') return queriesFacet;
        return null;
      }
    };
    
    const ctx = { config: {} };
    const facet = useScheduler(ctx, api, subsystem);
    
    // Error should be thrown when process() tries to use queue facet
    try {
      await facet.process(100);
      return { success: false, error: 'Should throw error when queue facet not found during process' };
    } catch (error) {
      if (!error.message.includes('queue facet not found')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'Throws error when queue facet not found during process',
      data: {}
    };
  };

  const testMissingProcessorFacet = async () => {
    const queueFacet = createQueueFacet();
    const statisticsFacet = createStatisticsFacet();
    const queriesFacet = createQueriesFacet();
    
    const subsystem = { 
      name: 'test-subsystem', 
      find: (kind) => {
        // Return queue facet but not processor facet
        if (kind === 'queue') return queueFacet;
        return null;
      }
    };
    const api = { name: 'test-subsystem' };
    
    api.__facets = {
      find: (kind) => {
        if (kind === 'queue') return queueFacet;
        if (kind === 'statistics') return statisticsFacet;
        if (kind === 'queries') return queriesFacet;
        return null;
      }
    };
    
    const ctx = { config: {} };
    const facet = useScheduler(ctx, api, subsystem);
    
    // Add a message to queue so process() will try to use processor facet
    const msg = createMessage('test/path', 'msg1');
    queueFacet.queue.enqueue({ msg, options: {} });
    
    // Verify message is in queue
    if (queueFacet.queue.size() === 0) {
      return { success: false, error: 'Message should be in queue before process test' };
    }
    
    // The scheduler catches errors internally, so process() won't throw
    // but will return a result with errors > 0
    const result = await facet.process(100);
    
    // The scheduler should catch the processor facet error and record it
    if (result.errors === 0) {
      return { success: false, error: 'Should record error when processor facet not found during process' };
    }
    
    // Verify the error was caught (scheduler increments error count)
    if (result.processed !== 0) {
      return { success: false, error: 'Should not process any messages when processor facet is missing' };
    }
    
    return {
      success: true,
      message: 'Records error when processor facet not found during process',
      data: { errors: result.errors, processed: result.processed }
    };
  };

  const testMissingStatisticsFacet = async () => {
    const queueFacet = createQueueFacet();
    const processorFacet = createProcessorFacet();
    const queriesFacet = createQueriesFacet();
    
    const subsystem = { 
      name: 'test-subsystem', 
      find: (kind) => {
        if (kind === 'queue') return queueFacet;
        if (kind === 'processor') return processorFacet;
        return null;
      }
    };
    const api = { name: 'test-subsystem' };
    
    api.__facets = {
      find: (kind) => {
        if (kind === 'queue') return queueFacet;
        if (kind === 'processor') return processorFacet;
        if (kind === 'queries') return queriesFacet;
        return null;
      }
    };
    
    const ctx = { config: {} };
    const facet = useScheduler(ctx, api, subsystem);
    
    // Statistics facet is optional - process() should work without it
    // (it just won't record time slices)
    const handler = async () => ({ success: true });
    processorFacet._routerFacet.registerRoute('test/path', handler);
    
    const msg = createMessage('test/path', 'msg1');
    await processorFacet.accept(msg);
    
    // Process should work, but won't record statistics
    const result = await facet.process(100);
    
    if (result.processed === undefined) {
      return { success: false, error: 'process should work without statistics facet' };
    }
    
    return {
      success: true,
      message: 'process works without statistics facet (graceful degradation)',
      data: { processed: result.processed }
    };
  };

  const testMissingQueriesFacet = async () => {
    const queueFacet = createQueueFacet();
    const processorFacet = createProcessorFacet();
    const statisticsFacet = createStatisticsFacet();
    
    const subsystem = { 
      name: 'test-subsystem', 
      find: (kind) => {
        if (kind === 'queue') return queueFacet;
        if (kind === 'processor') return processorFacet;
        return null;
      }
    };
    const api = { name: 'test-subsystem' };
    
    api.__facets = {
      find: (kind) => {
        if (kind === 'queue') return queueFacet;
        if (kind === 'processor') return processorFacet;
        if (kind === 'statistics') return statisticsFacet;
        return null;
      }
    };
    
    const ctx = { config: {} };
    const facet = useScheduler(ctx, api, subsystem);
    
    // Queries facet is optional for scheduler - it doesn't directly use it
    // The processor uses it, but scheduler just needs it declared as required
    // So process() should work without queries facet
    const handler = async () => ({ success: true });
    processorFacet._routerFacet.registerRoute('test/path', handler);
    
    const msg = createMessage('test/path', 'msg1');
    await processorFacet.accept(msg);
    
    // Process should work
    const result = await facet.process(100);
    
    if (result.processed === undefined) {
      return { success: false, error: 'process should work without queries facet' };
    }
    
    return {
      success: true,
      message: 'process works without queries facet (queries is for processor, not scheduler)',
      data: { processed: result.processed }
    };
  };

  const testSchedulerCreated = () => {
    const facet = createSchedulerFacet();
    
    if (!facet._scheduler) {
      return { success: false, error: 'Scheduler instance should be created immediately' };
    }
    
    return {
      success: true,
      message: 'Scheduler instance is created immediately',
      data: {}
    };
  };

  const testSchedulerType = () => {
    const facet = createSchedulerFacet();
    
    if (!(facet._scheduler instanceof SubsystemScheduler)) {
      return { success: false, error: '_scheduler should be a SubsystemScheduler instance' };
    }
    
    return {
      success: true,
      message: '_scheduler is a SubsystemScheduler instance',
      data: { instanceType: facet._scheduler.constructor.name }
    };
  };

  const testGetScheduler = () => {
    const facet = createSchedulerFacet();
    
    const scheduler = facet.getScheduler();
    
    if (!(scheduler instanceof SubsystemScheduler)) {
      return { success: false, error: 'getScheduler should return SubsystemScheduler instance' };
    }
    if (scheduler !== facet._scheduler) {
      return { success: false, error: 'getScheduler should return same instance as _scheduler' };
    }
    
    return {
      success: true,
      message: 'getScheduler returns SubsystemScheduler instance',
      data: {}
    };
  };

  const testProcessMessages = async () => {
    const facet = createSchedulerFacet();
    const handler = async (message) => ({ success: true, processed: message.id });
    facet._routerFacet.registerRoute('test/path', handler);
    
    // Enqueue messages
    const msg1 = createMessage('test/path', 'msg1');
    const msg2 = createMessage('test/path', 'msg2');
    
    await facet._processorFacet.accept(msg1);
    await facet._processorFacet.accept(msg2);
    
    const result = await facet.process(100); // 100ms time slice
    
    if (result.processed === undefined || result.processed < 0) {
      return { success: false, error: 'process should return processed count' };
    }
    if (result.processed === 0 && facet._queueFacet.queue.size() > 0) {
      return { success: false, error: 'Messages should be processed' };
    }
    
    return {
      success: true,
      message: 'process processes messages during time slice',
      data: { processed: result.processed, queueSize: facet._queueFacet.queue.size() }
    };
  };

  const testProcessResultStructure = async () => {
    const facet = createSchedulerFacet();
    const handler = async () => ({ success: true });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const msg1 = createMessage('test/path', 'msg1');
    await facet._processorFacet.accept(msg1);
    
    const result = await facet.process(100);
    
    const requiredKeys = ['processed', 'processingTime', 'errors'];
    const missingKeys = requiredKeys.filter(key => !(key in result));
    
    if (missingKeys.length > 0) {
      return { success: false, error: `Result missing keys: ${missingKeys.join(', ')}` };
    }
    if (typeof result.processed !== 'number' || typeof result.processingTime !== 'number' || 
        typeof result.errors !== 'number') {
      return { success: false, error: 'Result has incorrect types' };
    }
    
    return {
      success: true,
      message: 'process returns correct result structure',
      data: { keys: Object.keys(result) }
    };
  };

  const testProcessPaused = async () => {
    const facet = createSchedulerFacet();
    const handler = async () => ({ success: true });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const msg1 = createMessage('test/path', 'msg1');
    await facet._processorFacet.accept(msg1);
    
    facet.pauseProcessing();
    const result = await facet.process(100);
    
    if (result.status !== 'paused') {
      return { success: false, error: 'process should return paused status when paused' };
    }
    if (result.processed !== 0) {
      return { success: false, error: 'No messages should be processed when paused' };
    }
    if (result.remainingTime === undefined) {
      return { success: false, error: 'Result should include remainingTime when paused' };
    }
    
    return {
      success: true,
      message: 'process returns paused status when paused',
      data: { status: result.status, processed: result.processed }
    };
  };

  const testProcessRecordsTimeSlice = async () => {
    const facet = createSchedulerFacet();
    const handler = async () => ({ success: true });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const statsBefore = facet._statisticsFacet.getStatistics();
    await facet.process(100);
    const statsAfter = facet._statisticsFacet.getStatistics();
    
    if (statsAfter.timeSlicesReceived <= statsBefore.timeSlicesReceived) {
      return { success: false, error: 'Statistics should record time slice' };
    }
    
    return {
      success: true,
      message: 'process records time slice in statistics',
      data: { 
        before: statsBefore.timeSlicesReceived,
        after: statsAfter.timeSlicesReceived
      }
    };
  };

  const testProcessEmptyQueue = async () => {
    const facet = createSchedulerFacet();
    
    const result = await facet.process(100);
    
    if (result.processed !== 0) {
      return { success: false, error: 'process should return processed: 0 for empty queue' };
    }
    if (result.processingTime === undefined) {
      return { success: false, error: 'Result should include processingTime' };
    }
    
    return {
      success: true,
      message: 'process handles empty queue correctly',
      data: { processed: result.processed }
    };
  };

  const testPauseProcessing = () => {
    const facet = createSchedulerFacet();
    
    if (facet.isPaused() !== false) {
      return { success: false, error: 'Should start unpaused' };
    }
    
    facet.pauseProcessing();
    
    if (facet.isPaused() !== true) {
      return { success: false, error: 'pauseProcessing should set isPaused to true' };
    }
    
    return {
      success: true,
      message: 'pauseProcessing sets isPaused to true',
      data: {}
    };
  };

  const testResumeProcessing = () => {
    const facet = createSchedulerFacet();
    
    facet.pauseProcessing();
    if (facet.isPaused() !== true) {
      return { success: false, error: 'Should be paused before resume test' };
    }
    
    facet.resumeProcessing();
    
    if (facet.isPaused() !== false) {
      return { success: false, error: 'resumeProcessing should set isPaused to false' };
    }
    
    return {
      success: true,
      message: 'resumeProcessing sets isPaused to false',
      data: {}
    };
  };

  const testIsPaused = () => {
    const facet = createSchedulerFacet();
    
    // Test initial state
    if (facet.isPaused() !== false) {
      return { success: false, error: 'isPaused should return false initially' };
    }
    
    // Test paused state
    facet.pauseProcessing();
    if (facet.isPaused() !== true) {
      return { success: false, error: 'isPaused should return true when paused' };
    }
    
    // Test resumed state
    facet.resumeProcessing();
    if (facet.isPaused() !== false) {
      return { success: false, error: 'isPaused should return false when resumed' };
    }
    
    return {
      success: true,
      message: 'isPaused returns correct state',
      data: {}
    };
  };

  const testIsProcessingFalse = () => {
    const facet = createSchedulerFacet();
    
    if (facet.isProcessing() !== false) {
      return { success: false, error: 'isProcessing should return false initially' };
    }
    
    return {
      success: true,
      message: 'isProcessing returns false initially',
      data: {}
    };
  };

  const testIsProcessingTrue = () => {
    const facet = createSchedulerFacet();
    
    facet._setProcessing(true);
    
    if (facet.isProcessing() !== true) {
      return { success: false, error: 'isProcessing should return true when processing' };
    }
    
    return {
      success: true,
      message: 'isProcessing returns true when processing',
      data: {}
    };
  };

  const testSetProcessing = () => {
    const facet = createSchedulerFacet();
    
    facet._setProcessing(true);
    if (facet.isProcessing() !== true) {
      return { success: false, error: '_setProcessing(true) should set isProcessing to true' };
    }
    
    facet._setProcessing(false);
    if (facet.isProcessing() !== false) {
      return { success: false, error: '_setProcessing(false) should set isProcessing to false' };
    }
    
    return {
      success: true,
      message: '_setProcessing sets processing state correctly',
      data: {}
    };
  };

  const testGetPriorityDefault = () => {
    const facet = createSchedulerFacet();
    
    const priority = facet.getPriority();
    
    if (priority !== 1) {
      return { success: false, error: `Expected default priority 1, got ${priority}` };
    }
    
    return {
      success: true,
      message: 'getPriority returns default priority',
      data: { priority }
    };
  };

  const testGetPriorityConfigured = () => {
    const facet = createSchedulerFacet({ priority: 5 });
    
    const priority = facet.getPriority();
    
    if (priority !== 5) {
      return { success: false, error: `Expected priority 5, got ${priority}` };
    }
    
    return {
      success: true,
      message: 'getPriority returns configured priority',
      data: { priority }
    };
  };

  const testSetPriority = () => {
    const facet = createSchedulerFacet();
    
    facet.setPriority(10);
    
    if (facet.getPriority() !== 10) {
      return { success: false, error: 'setPriority should set priority correctly' };
    }
    
    return {
      success: true,
      message: 'setPriority sets priority correctly',
      data: { priority: facet.getPriority() }
    };
  };

  const testSetPriorityNegative = () => {
    const facet = createSchedulerFacet();
    
    try {
      facet.setPriority(-1);
      return { success: false, error: 'setPriority should throw error for negative numbers' };
    } catch (error) {
      if (!error.message.includes('non-negative number')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'setPriority throws error for negative numbers',
      data: {}
    };
  };

  const testSetPriorityNonNumber = () => {
    const facet = createSchedulerFacet();
    
    try {
      facet.setPriority('not-a-number');
      return { success: false, error: 'setPriority should throw error for non-numbers' };
    } catch (error) {
      if (!error.message.includes('non-negative number')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'setPriority throws error for non-numbers',
      data: {}
    };
  };

  const testConfigureSchedulerStrategy = () => {
    const facet = createSchedulerFacet();
    
    const initialStrategy = facet._scheduler.getCurrentStrategy();
    
    facet.configureScheduler({ strategy: 'fifo' });
    
    const newStrategy = facet._scheduler.getCurrentStrategy();
    
    if (newStrategy !== 'fifo') {
      return { success: false, error: 'configureScheduler should set strategy' };
    }
    
    return {
      success: true,
      message: 'configureScheduler configures strategy',
      data: { initialStrategy, newStrategy }
    };
  };

  const testConfigureSchedulerMaxMessages = () => {
    const facet = createSchedulerFacet();
    
    const initialMax = facet._scheduler.options.maxMessagesPerSlice;
    
    facet.configureScheduler({ maxMessagesPerSlice: 20 });
    
    const newMax = facet._scheduler.options.maxMessagesPerSlice;
    
    if (newMax !== 20) {
      return { success: false, error: 'configureScheduler should set maxMessagesPerSlice' };
    }
    
    return {
      success: true,
      message: 'configureScheduler configures maxMessagesPerSlice',
      data: { initialMax, newMax }
    };
  };

  const testConfigurationStrategy = () => {
    const facet = createSchedulerFacet({ schedulingStrategy: 'fifo' });
    
    if (facet._scheduler.getCurrentStrategy() !== 'fifo') {
      return { success: false, error: 'schedulingStrategy from config should be passed to SubsystemScheduler' };
    }
    
    return {
      success: true,
      message: 'Configuration schedulingStrategy is passed to SubsystemScheduler',
      data: { strategy: facet._scheduler.getCurrentStrategy() }
    };
  };

  const testConfigurationMaxMessages = () => {
    const facet = createSchedulerFacet({ maxMessagesPerSlice: 20 });
    
    if (facet._scheduler.options.maxMessagesPerSlice !== 20) {
      return { success: false, error: 'maxMessagesPerSlice from config should be passed to SubsystemScheduler' };
    }
    
    return {
      success: true,
      message: 'Configuration maxMessagesPerSlice is passed to SubsystemScheduler',
      data: { maxMessagesPerSlice: facet._scheduler.options.maxMessagesPerSlice }
    };
  };

  const testConfigurationPriority = () => {
    const facet = createSchedulerFacet({ priority: 5 });
    
    if (facet.getPriority() !== 5) {
      return { success: false, error: 'priority from config should be used' };
    }
    
    return {
      success: true,
      message: 'Configuration priority is used',
      data: { priority: facet.getPriority() }
    };
  };

  const testConfigurationDebug = () => {
    const facet = createSchedulerFacet({ debug: true });
    
    if (facet._scheduler.debug !== true) {
      return { success: false, error: 'Debug flag from config should be passed to SubsystemScheduler' };
    }
    
    return {
      success: true,
      message: 'Configuration debug flag is passed to SubsystemScheduler',
      data: { debug: facet._scheduler.debug }
    };
  };

  const testConfigurationDefaults = () => {
    const facet = createSchedulerFacet();
    
    // Default schedulingStrategy is 'priority'
    if (facet._scheduler.getCurrentStrategy() !== 'priority') {
      return { success: false, error: 'Default schedulingStrategy should be priority' };
    }
    
    // Default maxMessagesPerSlice is 10
    if (facet._scheduler.options.maxMessagesPerSlice !== 10) {
      return { success: false, error: 'Default maxMessagesPerSlice should be 10' };
    }
    
    // Default priority is 1
    if (facet.getPriority() !== 1) {
      return { success: false, error: 'Default priority should be 1' };
    }
    
    return {
      success: true,
      message: 'Default configuration values are used when config not provided',
      data: { 
        defaultStrategy: facet._scheduler.getCurrentStrategy(),
        defaultMaxMessages: facet._scheduler.options.maxMessagesPerSlice,
        defaultPriority: facet.getPriority()
      }
    };
  };

  const testFullWorkflow = async () => {
    const facet = createSchedulerFacet();
    const handler = async (message) => ({ success: true, processed: message.id });
    facet._routerFacet.registerRoute('test/path', handler);
    
    // Initial state
    if (facet.isPaused() !== false || facet.isProcessing() !== false) {
      return { success: false, error: 'Should start unpaused and not processing' };
    }
    
    // Accept messages
    const msg1 = createMessage('test/path', 'msg1');
    const msg2 = createMessage('test/path', 'msg2');
    
    await facet._processorFacet.accept(msg1);
    await facet._processorFacet.accept(msg2);
    
    if (facet._queueFacet.queue.size() !== 2) {
      return { success: false, error: 'Messages should be enqueued' };
    }
    
    // Pause
    facet.pauseProcessing();
    if (facet.isPaused() !== true) {
      return { success: false, error: 'Should be paused' };
    }
    
    // Process while paused (should return paused status)
    const pausedResult = await facet.process(100);
    if (pausedResult.status !== 'paused' || pausedResult.processed !== 0) {
      return { success: false, error: 'Process should return paused status when paused' };
    }
    
    // Resume
    facet.resumeProcessing();
    if (facet.isPaused() !== false) {
      return { success: false, error: 'Should be resumed' };
    }
    
    // Process messages
    const result = await facet.process(100);
    if (result.processed === undefined || result.processed < 0) {
      return { success: false, error: 'Process should return result' };
    }
    
    // Check statistics
    const stats = facet._statisticsFacet.getStatistics();
    if (stats.timeSlicesReceived < 1) {
      return { success: false, error: 'Statistics should reflect time slices' };
    }
    
    return {
      success: true,
      message: 'Full workflow: accept → pause → resume → process works correctly',
      data: { 
        messagesAccepted: 2,
        processed: result.processed,
        timeSlicesReceived: stats.timeSlicesReceived
      }
    };
  };

  const runAllTests = () => {
    testCases.forEach(test => {
      if (!results.has(test.name) && !runningTests.has(test.name)) {
        runTest(test.name);
      }
    });
  };

  const clearResults = () => {
    setResults(new Map());
    setSelectedTest(null);
  };

  const selectedResult = selectedTest ? results.get(selectedTest) : null;
  const isRunning = selectedTest ? runningTests.has(selectedTest) : false;

  // Group tests by category
  const testsByCategory = testCases.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', height: '100%', gap: '16px' }}>
      {/* Side Panel */}
      <div style={{
        width: '300px',
        backgroundColor: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          useScheduler Tests
        </h3>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button 
            onClick={runAllTests}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
          >
            Run All
          </button>
          <button 
            onClick={clearResults}
            style={{
              flex: 1,
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#4b5563'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#6b7280'}
          >
            Clear
          </button>
        </div>

        {/* Test Categories */}
        {Object.entries(testsByCategory).map(([category, tests]) => (
          <div key={category} style={{ marginBottom: '16px' }}>
            <h4 style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              {category}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {tests.map((test, idx) => {
                const result = results.get(test.name);
                const isRunning = runningTests.has(test.name);
                const hasResult = results.has(test.name);
                const isSelected = selectedTest === test.name;
                
                let bgColor, borderColor, selectedBgColor, selectedBorderColor;
                if (isRunning) {
                  bgColor = '#fef3c7';
                  borderColor = '#fcd34d';
                  selectedBgColor = '#fde68a';
                  selectedBorderColor = '#fbbf24';
                } else if (hasResult) {
                  bgColor = result.success ? '#f0fdf4' : '#fef2f2';
                  borderColor = result.success ? '#86efac' : '#fca5a5';
                  selectedBgColor = result.success ? '#dcfce7' : '#fee2e2';
                  selectedBorderColor = result.success ? '#4ade80' : '#f87171';
                } else {
                  bgColor = '#f3f4f6';
                  borderColor = '#d1d5db';
                  selectedBgColor = '#e5e7eb';
                  selectedBorderColor = '#9ca3af';
                }
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedTest(test.name);
                      if (!hasResult && !isRunning) {
                        runTest(test.name);
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      backgroundColor: isSelected ? selectedBgColor : bgColor,
                      border: '2px solid',
                      borderColor: isSelected ? selectedBorderColor : borderColor,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: isSelected ? '600' : '400'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        if (hasResult) {
                          e.target.style.backgroundColor = result.success ? '#dcfce7' : '#fee2e2';
                          e.target.style.borderColor = result.success ? '#4ade80' : '#f87171';
                        } else {
                          e.target.style.backgroundColor = '#e5e7eb';
                          e.target.style.borderColor = '#9ca3af';
                        }
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.target.style.backgroundColor = bgColor;
                        e.target.style.borderColor = borderColor;
                      }
                    }}
                  >
                    <span style={{ 
                      color: isRunning ? '#d97706' : (hasResult ? (result.success ? '#16a34a' : '#dc2626') : '#6b7280'),
                      fontWeight: 'bold',
                      fontSize: '14px'
                    }}>
                      {isRunning ? '⟳' : (hasResult ? (result.success ? '✓' : '✗') : '○')}
                    </span>
                    <span>{test.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Panel */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {selectedTest ? (
          <div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
              {selectedTest}
            </h2>
            
            {isRunning ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                border: '2px solid #fcd34d',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '20px' }}>⟳</span>
                <span>Running test...</span>
              </div>
            ) : selectedResult && selectedResult.success ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '2px solid #86efac',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#16a34a', fontWeight: '600' }}>Test Passed</span>
                </div>
                <div>
                  <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Message:</h3>
                  <div style={{
                    backgroundColor: '#f3f4f6',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    border: '1px solid #e5e7eb'
                  }}>
                    {selectedResult.message}
                  </div>
                </div>
                {selectedResult.data && Object.keys(selectedResult.data).length > 0 && (
                  <div>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>Data:</h3>
                    <pre style={{
                      backgroundColor: '#f3f4f6',
                      padding: '16px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                      border: '1px solid #e5e7eb'
                    }}>
                      {JSON.stringify(selectedResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ) : selectedResult ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fef2f2',
                border: '2px solid #fca5a5',
                borderRadius: '4px',
                color: '#dc2626'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '20px' }}>✗</span>
                  <strong>Test Failed</strong>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Error:</strong> {selectedResult.error}
                </div>
                {selectedResult.stack && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '500' }}>Stack Trace</summary>
                    <pre style={{
                      marginTop: '8px',
                      padding: '8px',
                      backgroundColor: '#fee2e2',
                      borderRadius: '4px',
                      fontSize: '11px',
                      overflow: 'auto'
                    }}>
                      {selectedResult.stack}
                    </pre>
                  </details>
                )}
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '200px',
                color: '#6b7280'
              }}>
                <p>Click the test name to run it</p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%',
            color: '#6b7280'
          }}>
            <p>Select a test from the side panel to view results</p>
          </div>
        )}
      </div>
    </div>
  );
}

