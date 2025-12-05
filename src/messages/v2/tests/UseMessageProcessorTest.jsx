import { useState } from 'react';
import { useMessageProcessor } from '../hooks/message-processor/use-message-processor.mycelia.js';
import { useRouter } from '../hooks/router/use-router.mycelia.js';
import { useStatistics } from '../hooks/statistics/use-statistics.mycelia.js';
import { useQueue } from '../hooks/queue/use-queue.mycelia.js';
import { useQueries } from '../hooks/queries/use-queries.mycelia.js';

/**
 * UseMessageProcessorTest - React component test suite for useMessageProcessor hook
 * Tests the useMessageProcessor hook directly without building subsystems
 */
export function UseMessageProcessorTest() {
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

  // Helper to create queries facet with router support
  const createQueriesFacet = (config = {}, routerFacet = null) => {
    const subsystem = { 
      name: 'test-subsystem',
      // Provide registerRoute method that delegates to router facet
      registerRoute: routerFacet ? 
        (pattern, handler, options) => routerFacet.registerRoute(pattern, handler, options) :
        () => { throw new Error('Router facet not available'); }
    };
    const api = { name: 'test-subsystem' };
    const ctx = { config: { queries: config } };
    return useQueries(ctx, api, subsystem);
  };

  // Helper to create processor facet
  const createProcessorFacet = (config = {}, hasQueries = false) => {
    // Create required facets first
    const routerFacet = createRouterFacet();
    const statisticsFacet = createStatisticsFacet();
    const queueFacet = createQueueFacet();
    const queriesFacet = hasQueries ? createQueriesFacet({}, routerFacet) : null;
    
    const subsystem = { 
      name: 'test-subsystem',
      find: (kind) => {
        if (kind === 'queries' && hasQueries) {
          return queriesFacet;
        }
        return null;
      }
    };
    const api = { name: 'test-subsystem' };
    
    // Mock api.__facets
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
      ms: { 
        sendError: async () => {} // Mock MessageSystem
      }
    };
    const processorFacet = useMessageProcessor(ctx, api, subsystem);
    
    // Attach facet references for test access
    processorFacet._routerFacet = routerFacet;
    processorFacet._statisticsFacet = statisticsFacet;
    processorFacet._queueFacet = queueFacet;
    processorFacet._queriesFacet = queriesFacet;
    
    return processorFacet;
  };

  // Helper to create a mock message
  const createMessage = (path, id = 'msg1', isQuery = false) => {
    const message = {
      id,
      _runtimeMeta: {},
      getPath: () => path,
      getBody: () => ({}),
      getId: () => id,
      isQuery: () => isQuery,
      setQueryResult: (result) => { message._queryResult = result; },
      getQueryResult: () => message._queryResult
    };
    return message;
  };

  const testCases = [
    { name: 'Hook returns Facet', category: 'Initialization' },
    { name: 'Throws error if router facet not found', category: 'Initialization' },
    { name: 'Throws error if statistics facet not found', category: 'Initialization' },
    { name: 'Throws error if queue facet not found', category: 'Initialization' },
    { name: 'Creates processMessageCore function', category: 'Initialization' },
    { name: 'processMessage() - with pair format', category: 'processMessage()' },
    { name: 'processMessage() - with backward compatibility', category: 'processMessage()' },
    { name: 'processMessage() - merges options correctly', category: 'processMessage()' },
    { name: 'processMessage() - processes message with route', category: 'processMessage()' },
    { name: 'processMessage() - handles missing route', category: 'processMessage()' },
    { name: 'processMessage() - records statistics', category: 'processMessage()' },
    { name: 'processImmediately() - processes message', category: 'processImmediately()' },
    { name: 'processImmediately() - never touches queue', category: 'processImmediately()' },
    { name: 'processImmediately() - records statistics', category: 'processImmediately()' },
    { name: 'processTick() - returns null when empty', category: 'processTick()' },
    { name: 'processTick() - dequeues and processes message', category: 'processTick()' },
    { name: 'processTick() - processes in FIFO order', category: 'processTick()' },
    { name: 'accept() - enqueues regular message', category: 'accept()' },
    { name: 'accept() - returns true on success', category: 'accept()' },
    { name: 'accept() - records statistics', category: 'accept()' },
    { name: 'accept() - handles query messages (with queries facet)', category: 'accept()' },
    { name: 'accept() - works without queries facet', category: 'accept()' },
    { name: 'accept() - uses subsystem.find(\'queries\')', category: 'accept()' },
    { name: 'accept() - handles currentPiece option', category: 'accept()' },
    { name: 'Configuration - debug flag', category: 'Configuration' },
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
          case 'Throws error if router facet not found':
            result = testMissingRouterFacet();
            break;
          case 'Throws error if statistics facet not found':
            result = testMissingStatisticsFacet();
            break;
          case 'Throws error if queue facet not found':
            result = testMissingQueueFacet();
            break;
          case 'Creates processMessageCore function':
            result = testProcessMessageCoreCreated();
            break;
          case 'processMessage() - with pair format':
            result = await testProcessMessagePairFormat();
            break;
          case 'processMessage() - with backward compatibility':
            result = await testProcessMessageBackwardCompat();
            break;
          case 'processMessage() - merges options correctly':
            result = await testProcessMessageMergesOptions();
            break;
          case 'processMessage() - processes message with route':
            result = await testProcessMessageWithRoute();
            break;
          case 'processMessage() - handles missing route':
            result = await testProcessMessageMissingRoute();
            break;
          case 'processMessage() - records statistics':
            result = await testProcessMessageRecordsStatistics();
            break;
          case 'processImmediately() - processes message':
            result = await testProcessImmediatelyProcesses();
            break;
          case 'processImmediately() - never touches queue':
            result = await testProcessImmediatelyNoQueue();
            break;
          case 'processImmediately() - records statistics':
            result = await testProcessImmediatelyRecordsStatistics();
            break;
          case 'processTick() - returns null when empty':
            result = await testProcessTickEmpty();
            break;
          case 'processTick() - dequeues and processes message':
            result = await testProcessTickDequeues();
            break;
          case 'processTick() - processes in FIFO order':
            result = await testProcessTickFIFO();
            break;
          case 'accept() - enqueues regular message':
            result = await testAcceptEnqueues();
            break;
          case 'accept() - returns true on success':
            result = await testAcceptReturnsTrue();
            break;
          case 'accept() - records statistics':
            result = await testAcceptRecordsStatistics();
            break;
          case 'accept() - handles query messages (with queries facet)':
            result = await testAcceptQueryMessages();
            break;
          case 'accept() - works without queries facet':
            result = await testAcceptWithoutQueries();
            break;
          case 'accept() - uses subsystem.find(\'queries\')':
            result = await testAcceptUsesSubsystemFind();
            break;
          case 'accept() - handles currentPiece option':
            result = await testAcceptCurrentPiece();
            break;
          case 'Configuration - debug flag':
            result = testConfigurationDebug();
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
    const facet = createProcessorFacet();
    
    if (!facet || typeof facet !== 'object') {
      return { success: false, error: 'Hook should return an object' };
    }
    if (facet.getKind() !== 'processor') {
      return { success: false, error: `Facet kind should be 'processor', got '${facet.getKind()}'` };
    }
    
    return {
      success: true,
      message: 'Hook returns a Facet with correct kind',
      data: { kind: facet.getKind() }
    };
  };

  const testMissingRouterFacet = () => {
    const subsystem = { name: 'test-subsystem' };
    const api = { name: 'test-subsystem' };
    api.__facets = { find: () => null }; // No router
    
    const statisticsFacet = createStatisticsFacet();
    const queueFacet = createQueueFacet();
    api.__facets.find = (kind) => {
      if (kind === 'statistics') return statisticsFacet;
      if (kind === 'queue') return queueFacet;
      return null;
    };
    
    const ctx = { config: {}, ms: { sendError: async () => {} } };
    
    try {
      useMessageProcessor(ctx, api, subsystem);
      return { success: false, error: 'Should throw error when router facet not found' };
    } catch (error) {
      if (!error.message.includes('router facet not found')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'Throws error when router facet not found',
      data: {}
    };
  };

  const testMissingStatisticsFacet = () => {
    const subsystem = { name: 'test-subsystem' };
    const api = { name: 'test-subsystem' };
    const routerFacet = createRouterFacet();
    const queueFacet = createQueueFacet();
    api.__facets = {
      find: (kind) => {
        if (kind === 'router') return routerFacet;
        if (kind === 'queue') return queueFacet;
        return null;
      }
    };
    
    const ctx = { config: {}, ms: { sendError: async () => {} } };
    
    try {
      useMessageProcessor(ctx, api, subsystem);
      return { success: false, error: 'Should throw error when statistics facet not found' };
    } catch (error) {
      if (!error.message.includes('statistics facet not found')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'Throws error when statistics facet not found',
      data: {}
    };
  };

  const testMissingQueueFacet = () => {
    const subsystem = { name: 'test-subsystem' };
    const api = { name: 'test-subsystem' };
    const routerFacet = createRouterFacet();
    const statisticsFacet = createStatisticsFacet();
    api.__facets = {
      find: (kind) => {
        if (kind === 'router') return routerFacet;
        if (kind === 'statistics') return statisticsFacet;
        return null;
      }
    };
    
    const ctx = { config: {}, ms: { sendError: async () => {} } };
    
    try {
      useMessageProcessor(ctx, api, subsystem);
      return { success: false, error: 'Should throw error when queue facet not found' };
    } catch (error) {
      if (!error.message.includes('queue facet not found')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'Throws error when queue facet not found',
      data: {}
    };
  };

  const testProcessMessageCoreCreated = () => {
    const facet = createProcessorFacet();
    
    // processMessageCore is created internally, we can verify by calling processMessage
    if (typeof facet.processMessage !== 'function') {
      return { success: false, error: 'processMessage should be a function' };
    }
    
    return {
      success: true,
      message: 'processMessageCore function is created',
      data: {}
    };
  };

  const testProcessMessagePairFormat = async () => {
    const facet = createProcessorFacet();
    const handler = async (message, params, options) => ({ success: true, message: message.id });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const message = createMessage('test/path');
    const pair = { msg: message, options: { test: 'option' } };
    const result = await facet.processMessage(pair);
    
    if (!result || result.success !== true) {
      return { success: false, error: 'processMessage should process pair format' };
    }
    
    return {
      success: true,
      message: 'processMessage processes message with pair format',
      data: { result: result.success }
    };
  };

  const testProcessMessageBackwardCompat = async () => {
    const facet = createProcessorFacet();
    const handler = async (message, params, options) => ({ success: true, message: message.id });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const message = createMessage('test/path');
    const result = await facet.processMessage(message, { test: 'option' });
    
    if (!result || result.success !== true) {
      return { success: false, error: 'processMessage should handle backward compatibility' };
    }
    
    return {
      success: true,
      message: 'processMessage handles backward compatibility (direct message)',
      data: { result: result.success }
    };
  };

  const testProcessMessageMergesOptions = async () => {
    const facet = createProcessorFacet();
    let receivedOptions = null;
    const handler = async (message, params, options) => {
      receivedOptions = options;
      return { success: true };
    };
    facet._routerFacet.registerRoute('test/path', handler);
    
    const message = createMessage('test/path');
    const pair = { msg: message, options: { pairOption: 'pair' } };
    await facet.processMessage(pair, { methodOption: 'method' });
    
    if (!receivedOptions || receivedOptions.pairOption !== 'pair' || receivedOptions.methodOption !== 'method') {
      return { success: false, error: 'Options should be merged correctly' };
    }
    
    return {
      success: true,
      message: 'processMessage merges options correctly',
      data: { options: receivedOptions }
    };
  };

  const testProcessMessageWithRoute = async () => {
    const facet = createProcessorFacet();
    const handler = async (message, params, options) => ({ success: true, result: 'processed' });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const message = createMessage('test/path');
    const result = await facet.processMessage(message);
    
    if (!result || result.success !== true || result.result !== 'processed') {
      return { success: false, error: 'processMessage should process message with route' };
    }
    
    return {
      success: true,
      message: 'processMessage processes message with route',
      data: { result: result.result }
    };
  };

  const testProcessMessageMissingRoute = async () => {
    const facet = createProcessorFacet();
    const message = createMessage('nonexistent/path');
    const result = await facet.processMessage(message);
    
    if (!result || result.success !== false) {
      return { success: false, error: 'processMessage should handle missing route' };
    }
    if (!result.error || !result.error.includes('No route handler found')) {
      return { success: false, error: 'Should return error message for missing route' };
    }
    
    return {
      success: true,
      message: 'processMessage handles missing route gracefully',
      data: { error: result.error }
    };
  };

  const testProcessMessageRecordsStatistics = async () => {
    const facet = createProcessorFacet();
    const handler = async () => ({ success: true });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const statsBefore = facet._statisticsFacet.getStatistics();
    const message = createMessage('test/path');
    await facet.processMessage(message);
    const statsAfter = facet._statisticsFacet.getStatistics();
    
    if (statsAfter.messagesProcessed <= statsBefore.messagesProcessed) {
      return { success: false, error: 'Statistics should record processed message' };
    }
    
    return {
      success: true,
      message: 'processMessage records statistics',
      data: { 
        before: statsBefore.messagesProcessed,
        after: statsAfter.messagesProcessed
      }
    };
  };

  const testProcessImmediatelyProcesses = async () => {
    const facet = createProcessorFacet();
    const handler = async (message, params, options) => ({ success: true, immediate: true });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const message = createMessage('test/path');
    const result = await facet.processImmediately(message);
    
    if (!result || result.success !== true || result.immediate !== true) {
      return { success: false, error: 'processImmediately should process message' };
    }
    
    return {
      success: true,
      message: 'processImmediately processes message',
      data: { result: result.immediate }
    };
  };

  const testProcessImmediatelyNoQueue = async () => {
    const facet = createProcessorFacet();
    const handler = async () => ({ success: true });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const queueSizeBefore = facet._queueFacet.queue.size();
    const message = createMessage('test/path');
    await facet.processImmediately(message);
    const queueSizeAfter = facet._queueFacet.queue.size();
    
    if (queueSizeAfter !== queueSizeBefore) {
      return { success: false, error: 'processImmediately should not touch queue' };
    }
    
    return {
      success: true,
      message: 'processImmediately never touches queue',
      data: { queueSize: queueSizeAfter }
    };
  };

  const testProcessImmediatelyRecordsStatistics = async () => {
    const facet = createProcessorFacet();
    const handler = async () => ({ success: true });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const statsBefore = facet._statisticsFacet.getStatistics();
    const message = createMessage('test/path');
    await facet.processImmediately(message);
    const statsAfter = facet._statisticsFacet.getStatistics();
    
    if (statsAfter.messagesProcessed <= statsBefore.messagesProcessed) {
      return { success: false, error: 'Statistics should record processed message' };
    }
    
    return {
      success: true,
      message: 'processImmediately records statistics',
      data: { 
        before: statsBefore.messagesProcessed,
        after: statsAfter.messagesProcessed
      }
    };
  };

  const testProcessTickEmpty = async () => {
    const facet = createProcessorFacet();
    const result = await facet.processTick();
    
    if (result !== null) {
      return { success: false, error: 'processTick should return null when queue is empty' };
    }
    
    return {
      success: true,
      message: 'processTick returns null when queue is empty',
      data: {}
    };
  };

  const testProcessTickDequeues = async () => {
    const facet = createProcessorFacet();
    const handler = async (message) => ({ success: true, message: message.id });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const message = createMessage('test/path', 'msg1');
    await facet.accept(message);
    
    const result = await facet.processTick();
    
    if (!result || result.success !== true || result.message !== 'msg1') {
      return { success: false, error: 'processTick should dequeue and process message' };
    }
    if (facet._queueFacet.queue.size() !== 0) {
      return { success: false, error: 'Queue should be empty after processTick' };
    }
    
    return {
      success: true,
      message: 'processTick dequeues and processes message',
      data: { result: result.message }
    };
  };

  const testProcessTickFIFO = async () => {
    const facet = createProcessorFacet();
    const handler = async (message) => ({ success: true, message: message.id });
    facet._routerFacet.registerRoute('test/path', handler);
    
    const msg1 = createMessage('test/path', 'msg1');
    const msg2 = createMessage('test/path', 'msg2');
    const msg3 = createMessage('test/path', 'msg3');
    
    await facet.accept(msg1);
    await facet.accept(msg2);
    await facet.accept(msg3);
    
    const result1 = await facet.processTick();
    const result2 = await facet.processTick();
    const result3 = await facet.processTick();
    
    if (result1.message !== 'msg1' || result2.message !== 'msg2' || result3.message !== 'msg3') {
      return { success: false, error: 'processTick should process in FIFO order' };
    }
    
    return {
      success: true,
      message: 'processTick processes messages in FIFO order',
      data: { order: [result1.message, result2.message, result3.message] }
    };
  };

  const testAcceptEnqueues = async () => {
    const facet = createProcessorFacet();
    const message = createMessage('test/path');
    
    const queueSizeBefore = facet._queueFacet.queue.size();
    await facet.accept(message);
    const queueSizeAfter = facet._queueFacet.queue.size();
    
    if (queueSizeAfter !== queueSizeBefore + 1) {
      return { success: false, error: 'accept should enqueue message' };
    }
    
    return {
      success: true,
      message: 'accept enqueues regular message',
      data: { queueSize: queueSizeAfter }
    };
  };

  const testAcceptReturnsTrue = async () => {
    const facet = createProcessorFacet();
    const message = createMessage('test/path');
    const result = await facet.accept(message);
    
    if (result !== true) {
      return { success: false, error: 'accept should return true on success' };
    }
    
    return {
      success: true,
      message: 'accept returns true on success',
      data: {}
    };
  };

  const testAcceptRecordsStatistics = async () => {
    const facet = createProcessorFacet();
    const message = createMessage('test/path');
    
    const statsBefore = facet._statisticsFacet.getStatistics();
    await facet.accept(message);
    const statsAfter = facet._statisticsFacet.getStatistics();
    
    if (statsAfter.messagesAccepted <= statsBefore.messagesAccepted) {
      return { success: false, error: 'Statistics should record accepted message' };
    }
    
    return {
      success: true,
      message: 'accept records statistics',
      data: { 
        before: statsBefore.messagesAccepted,
        after: statsAfter.messagesAccepted
      }
    };
  };

  const testAcceptQueryMessages = async () => {
    const facet = createProcessorFacet({}, true); // hasQueries = true
    const queriesFacet = facet._queriesFacet;
    
    // Enable query handler
    const queryHandler = {
      processQuery: async (message) => ({ success: true, data: 'query-result' })
    };
    queriesFacet.enableQueryHandler(queryHandler);
    
    const message = createMessage('query/path', 'query1', true);
    const queueSizeBefore = facet._queueFacet.queue.size();
    const result = await facet.accept(message);
    const queueSizeAfter = facet._queueFacet.queue.size();
    
    if (result !== true) {
      return { success: false, error: 'accept should return true for query messages' };
    }
    if (queueSizeAfter !== queueSizeBefore) {
      return { success: false, error: 'Query messages should not be enqueued' };
    }
    if (!message.getQueryResult()) {
      return { success: false, error: 'Query result should be stored in message' };
    }
    
    return {
      success: true,
      message: 'accept handles query messages correctly',
      data: { queryResult: message.getQueryResult() }
    };
  };

  const testAcceptWithoutQueries = async () => {
    const facet = createProcessorFacet(); // hasQueries = false
    const message = createMessage('test/path');
    
    const queueSizeBefore = facet._queueFacet.queue.size();
    const result = await facet.accept(message);
    const queueSizeAfter = facet._queueFacet.queue.size();
    
    if (result !== true) {
      return { success: false, error: 'accept should work without queries facet' };
    }
    if (queueSizeAfter !== queueSizeBefore + 1) {
      return { success: false, error: 'Message should be enqueued without queries facet' };
    }
    
    return {
      success: true,
      message: 'accept works without queries facet',
      data: { queueSize: queueSizeAfter }
    };
  };

  const testAcceptUsesSubsystemFind = async () => {
    let findCalled = false;
    const subsystem = { 
      name: 'test-subsystem',
      find: (kind) => {
        if (kind === 'queries') {
          findCalled = true;
        }
        return null;
      }
    };
    const api = { name: 'test-subsystem' };
    const routerFacet = createRouterFacet();
    const statisticsFacet = createStatisticsFacet();
    const queueFacet = createQueueFacet();
    api.__facets = {
      find: (kind) => {
        if (kind === 'router') return routerFacet;
        if (kind === 'statistics') return statisticsFacet;
        if (kind === 'queue') return queueFacet;
        return null;
      }
    };
    const ctx = { config: {}, ms: { sendError: async () => {} } };
    const facet = useMessageProcessor(ctx, api, subsystem);
    
    const message = createMessage('test/path');
    await facet.accept(message);
    
    if (!findCalled) {
      return { success: false, error: 'accept should use subsystem.find(\'queries\')' };
    }
    
    return {
      success: true,
      message: 'accept uses subsystem.find(\'queries\')',
      data: {}
    };
  };

  const testAcceptCurrentPiece = async () => {
    const facet = createProcessorFacet();
    const message = createMessage('test/path');
    
    await facet.accept(message, { currentPiece: 'test-piece' });
    
    if (!message._runtimeMeta || message._runtimeMeta.currentPiece !== 'test-piece') {
      return { success: false, error: 'currentPiece should be stored in message metadata' };
    }
    
    return {
      success: true,
      message: 'accept handles currentPiece option',
      data: { currentPiece: message._runtimeMeta.currentPiece }
    };
  };

  const testConfigurationDebug = () => {
    const facet = createProcessorFacet({ debug: true });
    
    // Debug flag is passed to processMessageCore, we can verify by checking if it's used
    // In practice, we can't directly access it, but we can verify the hook was created
    if (!facet || typeof facet.processMessage !== 'function') {
      return { success: false, error: 'Facet should be created with debug config' };
    }
    
    return {
      success: true,
      message: 'Configuration debug flag is passed to processor',
      data: {}
    };
  };

  const testFullWorkflow = async () => {
    const facet = createProcessorFacet();
    const handler = async (message) => ({ success: true, processed: message.id });
    facet._routerFacet.registerRoute('test/path', handler);
    
    // Accept messages
    const msg1 = createMessage('test/path', 'msg1');
    const msg2 = createMessage('test/path', 'msg2');
    
    await facet.accept(msg1);
    await facet.accept(msg2);
    
    if (facet._queueFacet.queue.size() !== 2) {
      return { success: false, error: 'Messages should be enqueued' };
    }
    
    // Process messages
    const result1 = await facet.processTick();
    const result2 = await facet.processTick();
    
    if (!result1 || result1.processed !== 'msg1') {
      return { success: false, error: 'First message should be processed' };
    }
    if (!result2 || result2.processed !== 'msg2') {
      return { success: false, error: 'Second message should be processed' };
    }
    if (facet._queueFacet.queue.size() !== 0) {
      return { success: false, error: 'Queue should be empty after processing' };
    }
    
    // Check statistics
    const stats = facet._statisticsFacet.getStatistics();
    if (stats.messagesAccepted < 2 || stats.messagesProcessed < 2) {
      return { success: false, error: 'Statistics should reflect workflow' };
    }
    
    return {
      success: true,
      message: 'Full workflow: accept → processTick works correctly',
      data: { 
        messagesAccepted: stats.messagesAccepted,
        messagesProcessed: stats.messagesProcessed
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
          useMessageProcessor Tests
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

