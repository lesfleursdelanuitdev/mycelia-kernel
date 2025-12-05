import { useState } from 'react';
import { useQueries } from '../hooks/queries/use-queries.mycelia.js';
import { QueryHandlerManager } from '../hooks/queries/QueryHandlerManager.mycelia.js';
import { useRouter } from '../hooks/router/use-router.mycelia.js';
import { useRequests } from '../hooks/requests/use-requests.mycelia.js';

// NOTE: This test file needs to be rewritten for the new useQueries API
// The new API uses register(), registerRoute(), and ask() instead of enableQueryHandler()

/**
 * UseQueriesTest - React component test suite for useQueries hook
 * Tests the useQueries hook directly without building subsystems
 */
export function UseQueriesTest() {
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

  // Helper to create queries facet with router support
  const createQueriesFacet = (config = {}, routerFacet = null) => {
    // Create router facet if not provided
    const router = routerFacet || createRouterFacet();
    
    const subsystem = { 
      name: 'test-subsystem',
      // Provide registerRoute and unregisterRoute methods that delegate to router facet
      registerRoute: (pattern, handler, options) => router.registerRoute(pattern, handler, options),
      unregisterRoute: (pattern) => router.unregisterRoute(pattern)
    };
    const api = { name: 'test-subsystem' };
    const ctx = { config: { queries: config } };
    const queriesFacet = useQueries(ctx, api, subsystem);
    
    // Attach router facet for test access
    queriesFacet._routerFacet = router;
    
    return queriesFacet;
  };

  // Helper to create a mock query handler
  const createQueryHandler = (processQueryImpl = null) => {
    return {
      processQuery: processQueryImpl || (async (message) => ({ success: true, data: 'result' }))
    };
  };

  // Helper to create a mock message
  const createMessage = (path, id = 'msg1', isQuery = false) => {
    return {
      id,
      getPath: () => path,
      getBody: () => ({}),
      isQuery: () => isQuery
    };
  };

  const testCases = [
    { name: 'Hook returns Facet', category: 'Initialization' },
    { name: 'QueryHandlerManager instance created immediately', category: 'Initialization' },
    { name: '_queryHandlerManager is QueryHandlerManager instance', category: 'Initialization' },
    { name: 'hasQueryHandler() - returns false initially', category: 'hasQueryHandler()' },
    { name: 'hasQueryHandler() - returns true after enabling', category: 'hasQueryHandler()' },
    { name: 'hasQueryHandler() - returns false after disabling', category: 'hasQueryHandler()' },
    { name: 'enableQueryHandler() - enables handler successfully', category: 'enableQueryHandler()' },
    { name: 'enableQueryHandler() - returns true on success', category: 'enableQueryHandler()' },
    { name: 'enableQueryHandler() - throws error for invalid handler', category: 'enableQueryHandler()' },
    { name: 'enableQueryHandler() - throws error for null handler', category: 'enableQueryHandler()' },
    { name: 'enableQueryHandler() - registers query/* route', category: 'enableQueryHandler()' },
    { name: 'enableQueryHandler() - returns true if already enabled', category: 'enableQueryHandler()' },
    { name: 'disableQueryHandler() - disables handler successfully', category: 'disableQueryHandler()' },
    { name: 'disableQueryHandler() - returns true when enabled', category: 'disableQueryHandler()' },
    { name: 'disableQueryHandler() - returns false when not enabled', category: 'disableQueryHandler()' },
    { name: 'disableQueryHandler() - unregisters query/* route', category: 'disableQueryHandler()' },
    { name: 'Route registration - query/* route matches query paths', category: 'Route Registration' },
    { name: 'Route registration - route handler calls processQuery', category: 'Route Registration' },
    { name: 'Route registration - route has correct metadata', category: 'Route Registration' },
    { name: 'Query handler processing - processQuery is called correctly', category: 'Query Processing' },
    { name: 'Query handler processing - handler result is returned', category: 'Query Processing' },
    { name: 'Configuration - debug flag from config', category: 'Configuration' },
    { name: 'Configuration - default debug value', category: 'Configuration' },
    { name: 'Full workflow test', category: 'Integration' },
    { name: 'Multiple enable/disable cycles', category: 'Integration' },
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
          case 'QueryHandlerManager instance created immediately':
            result = testQueryHandlerManagerCreated();
            break;
          case '_queryHandlerManager is QueryHandlerManager instance':
            result = testQueryHandlerManagerType();
            break;
          case 'hasQueryHandler() - returns false initially':
            result = testHasQueryHandlerFalse();
            break;
          case 'hasQueryHandler() - returns true after enabling':
            result = testHasQueryHandlerTrue();
            break;
          case 'hasQueryHandler() - returns false after disabling':
            result = testHasQueryHandlerAfterDisable();
            break;
          case 'enableQueryHandler() - enables handler successfully':
            result = testEnableQueryHandlerSuccess();
            break;
          case 'enableQueryHandler() - returns true on success':
            result = testEnableQueryHandlerReturnsTrue();
            break;
          case 'enableQueryHandler() - throws error for invalid handler':
            result = testEnableQueryHandlerInvalidHandler();
            break;
          case 'enableQueryHandler() - throws error for null handler':
            result = testEnableQueryHandlerNullHandler();
            break;
          case 'enableQueryHandler() - registers query/* route':
            result = testEnableQueryHandlerRegistersRoute();
            break;
          case 'enableQueryHandler() - returns true if already enabled':
            result = testEnableQueryHandlerIdempotent();
            break;
          case 'disableQueryHandler() - disables handler successfully':
            result = testDisableQueryHandlerSuccess();
            break;
          case 'disableQueryHandler() - returns true when enabled':
            result = testDisableQueryHandlerReturnsTrue();
            break;
          case 'disableQueryHandler() - returns false when not enabled':
            result = testDisableQueryHandlerReturnsFalse();
            break;
          case 'disableQueryHandler() - unregisters query/* route':
            result = testDisableQueryHandlerUnregistersRoute();
            break;
          case 'Route registration - query/* route matches query paths':
            result = await testRouteMatchesQueryPaths();
            break;
          case 'Route registration - route handler calls processQuery':
            result = await testRouteHandlerCallsProcessQuery();
            break;
          case 'Route registration - route has correct metadata':
            result = testRouteHasCorrectMetadata();
            break;
          case 'Query handler processing - processQuery is called correctly':
            result = await testProcessQueryCalledCorrectly();
            break;
          case 'Query handler processing - handler result is returned':
            result = await testProcessQueryReturnsResult();
            break;
          case 'Configuration - debug flag from config':
            result = testConfigurationDebug();
            break;
          case 'Configuration - default debug value':
            result = testConfigurationDefaultDebug();
            break;
          case 'Full workflow test':
            result = await testFullWorkflow();
            break;
          case 'Multiple enable/disable cycles':
            result = await testMultipleEnableDisableCycles();
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
    const facet = createQueriesFacet();
    
    if (!facet || typeof facet !== 'object') {
      return { success: false, error: 'Hook should return an object' };
    }
    if (facet.getKind() !== 'queries') {
      return { success: false, error: `Facet kind should be 'queries', got '${facet.getKind()}'` };
    }
    
    return {
      success: true,
      message: 'Hook returns a Facet with correct kind',
      data: { kind: facet.getKind() }
    };
  };

  const testQueryHandlerManagerCreated = () => {
    const facet = createQueriesFacet();
    
    if (!facet._queryHandlerManager) {
      return { success: false, error: 'QueryHandlerManager instance should be created immediately' };
    }
    
    return {
      success: true,
      message: 'QueryHandlerManager instance is created immediately',
      data: {}
    };
  };

  const testQueryHandlerManagerType = () => {
    const facet = createQueriesFacet();
    
    if (!(facet._queryHandlerManager instanceof QueryHandlerManager)) {
      return { success: false, error: '_queryHandlerManager should be a QueryHandlerManager instance' };
    }
    
    return {
      success: true,
      message: '_queryHandlerManager is a QueryHandlerManager instance',
      data: { instanceType: facet._queryHandlerManager.constructor.name }
    };
  };

  const testHasQueryHandlerFalse = () => {
    const facet = createQueriesFacet();
    
    if (facet.hasQueryHandler() !== false) {
      return { success: false, error: 'hasQueryHandler should return false initially' };
    }
    
    return {
      success: true,
      message: 'hasQueryHandler returns false initially',
      data: {}
    };
  };

  const testHasQueryHandlerTrue = () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    facet.enableQueryHandler(handler);
    
    if (facet.hasQueryHandler() !== true) {
      return { success: false, error: 'hasQueryHandler should return true after enabling' };
    }
    
    return {
      success: true,
      message: 'hasQueryHandler returns true after enabling handler',
      data: {}
    };
  };

  const testHasQueryHandlerAfterDisable = () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    facet.enableQueryHandler(handler);
    if (facet.hasQueryHandler() !== true) {
      return { success: false, error: 'Handler should be enabled before disable test' };
    }
    
    facet.disableQueryHandler();
    
    if (facet.hasQueryHandler() !== false) {
      return { success: false, error: 'hasQueryHandler should return false after disabling' };
    }
    
    return {
      success: true,
      message: 'hasQueryHandler returns false after disabling handler',
      data: {}
    };
  };

  const testEnableQueryHandlerSuccess = () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    const result = facet.enableQueryHandler(handler);
    
    if (result !== true) {
      return { success: false, error: 'enableQueryHandler should return true on success' };
    }
    if (!facet.hasQueryHandler()) {
      return { success: false, error: 'Handler should be enabled after enableQueryHandler' };
    }
    
    return {
      success: true,
      message: 'enableQueryHandler enables handler successfully',
      data: {}
    };
  };

  const testEnableQueryHandlerReturnsTrue = () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    const result = facet.enableQueryHandler(handler);
    
    if (result !== true) {
      return { success: false, error: 'enableQueryHandler should return true' };
    }
    
    return {
      success: true,
      message: 'enableQueryHandler returns true on success',
      data: {}
    };
  };

  const testEnableQueryHandlerInvalidHandler = () => {
    const facet = createQueriesFacet();
    const invalidHandler = { notProcessQuery: () => {} };
    
    try {
      facet.enableQueryHandler(invalidHandler);
      return { success: false, error: 'enableQueryHandler should throw error for invalid handler' };
    } catch (error) {
      if (!error.message.includes('processQuery')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'enableQueryHandler throws error for invalid handler',
      data: {}
    };
  };

  const testEnableQueryHandlerNullHandler = () => {
    const facet = createQueriesFacet();
    
    try {
      facet.enableQueryHandler(null);
      return { success: false, error: 'enableQueryHandler should throw error for null handler' };
    } catch (error) {
      if (!error.message.includes('processQuery')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'enableQueryHandler throws error for null handler',
      data: {}
    };
  };

  const testEnableQueryHandlerRegistersRoute = () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    if (facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'Route should not exist before enabling handler' };
    }
    
    facet.enableQueryHandler(handler);
    
    if (!facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'query/* route should be registered after enabling handler' };
    }
    
    return {
      success: true,
      message: 'enableQueryHandler registers query/* route',
      data: {}
    };
  };

  const testEnableQueryHandlerIdempotent = () => {
    const facet = createQueriesFacet();
    const handler1 = createQueryHandler();
    const handler2 = createQueryHandler();
    
    const result1 = facet.enableQueryHandler(handler1);
    const result2 = facet.enableQueryHandler(handler2);
    
    if (result1 !== true || result2 !== true) {
      return { success: false, error: 'Both enable calls should return true' };
    }
    
    // Handler should still be the first one (not replaced)
    const currentHandler = facet._queryHandlerManager.getHandler();
    if (currentHandler !== handler1) {
      return { success: false, error: 'Handler should not be replaced on second enable' };
    }
    
    return {
      success: true,
      message: 'enableQueryHandler is idempotent (returns true if already enabled)',
      data: {}
    };
  };

  const testDisableQueryHandlerSuccess = () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    facet.enableQueryHandler(handler);
    if (!facet.hasQueryHandler()) {
      return { success: false, error: 'Handler should be enabled before disable test' };
    }
    
    facet.disableQueryHandler();
    
    if (facet.hasQueryHandler()) {
      return { success: false, error: 'Handler should be disabled after disableQueryHandler' };
    }
    
    return {
      success: true,
      message: 'disableQueryHandler disables handler successfully',
      data: {}
    };
  };

  const testDisableQueryHandlerReturnsTrue = () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    facet.enableQueryHandler(handler);
    const result = facet.disableQueryHandler();
    
    if (result !== true) {
      return { success: false, error: 'disableQueryHandler should return true when handler was enabled' };
    }
    
    return {
      success: true,
      message: 'disableQueryHandler returns true when enabled',
      data: {}
    };
  };

  const testDisableQueryHandlerReturnsFalse = () => {
    const facet = createQueriesFacet();
    
    const result = facet.disableQueryHandler();
    
    if (result !== false) {
      return { success: false, error: 'disableQueryHandler should return false when no handler enabled' };
    }
    
    return {
      success: true,
      message: 'disableQueryHandler returns false when not enabled',
      data: {}
    };
  };

  const testDisableQueryHandlerUnregistersRoute = () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    facet.enableQueryHandler(handler);
    if (!facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'Route should be registered before disable test' };
    }
    
    facet.disableQueryHandler();
    
    if (facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'query/* route should be unregistered after disabling handler' };
    }
    
    return {
      success: true,
      message: 'disableQueryHandler unregisters query/* route',
      data: {}
    };
  };

  const testRouteMatchesQueryPaths = async () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    facet.enableQueryHandler(handler);
    
    // Test various query paths
    const paths = ['query/test', 'query/user/123', 'query/data/list'];
    
    for (const path of paths) {
      const match = facet._routerFacet.match(path);
      if (!match) {
        return { success: false, error: `Route should match path: ${path}` };
      }
    }
    
    return {
      success: true,
      message: 'query/* route matches query paths',
      data: { pathsTested: paths }
    };
  };

  const testRouteHandlerCallsProcessQuery = async () => {
    const facet = createQueriesFacet();
    let processQueryCalled = false;
    let receivedMessage = null;
    
    const handler = createQueryHandler(async (message) => {
      processQueryCalled = true;
      receivedMessage = message;
      return { success: true, data: 'test-result' };
    });
    
    facet.enableQueryHandler(handler);
    
    const message = createMessage('query/test', 'test-msg');
    const match = facet._routerFacet.match('query/test');
    
    if (!match) {
      return { success: false, error: 'Route should match query/test' };
    }
    
    const result = await match.handler(message, match.params, {});
    
    if (!processQueryCalled) {
      return { success: false, error: 'Route handler should call processQuery' };
    }
    if (receivedMessage !== message) {
      return { success: false, error: 'Handler should receive correct message' };
    }
    if (result.data !== 'test-result') {
      return { success: false, error: 'Handler result should be returned' };
    }
    
    return {
      success: true,
      message: 'Route handler calls processQuery correctly',
      data: { result: result.data }
    };
  };

  const testRouteHasCorrectMetadata = () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler();
    
    facet.enableQueryHandler(handler);
    
    const routes = facet._routerFacet.getRoutes();
    const queryRoute = routes.find(r => r.pattern === 'query/*');
    
    if (!queryRoute) {
      return { success: false, error: 'query/* route should exist' };
    }
    if (queryRoute.metadata?.description !== 'Query operations') {
      return { success: false, error: 'Route should have correct description' };
    }
    if (queryRoute.metadata?.priority !== 10) {
      return { success: false, error: 'Route should have priority 10' };
    }
    
    return {
      success: true,
      message: 'Route has correct metadata',
      data: { 
        description: queryRoute.metadata.description,
        priority: queryRoute.metadata.priority
      }
    };
  };

  const testProcessQueryCalledCorrectly = async () => {
    const facet = createQueriesFacet();
    let processQueryCalled = false;
    let receivedMessage = null;
    
    const handler = createQueryHandler(async (message) => {
      processQueryCalled = true;
      receivedMessage = message;
      return { success: true };
    });
    
    facet.enableQueryHandler(handler);
    
    const message = createMessage('query/test', 'test-msg');
    const result = await facet._queryHandlerManager.processQuery(message);
    
    if (!processQueryCalled) {
      return { success: false, error: 'processQuery should be called' };
    }
    if (receivedMessage !== message) {
      return { success: false, error: 'Handler should receive correct message' };
    }
    if (!result || result.success !== true) {
      return { success: false, error: 'Handler result should be returned' };
    }
    
    return {
      success: true,
      message: 'processQuery is called correctly',
      data: { result: result.success }
    };
  };

  const testProcessQueryReturnsResult = async () => {
    const facet = createQueriesFacet();
    const handler = createQueryHandler(async (message) => {
      return { success: true, data: 'custom-result', id: message.id };
    });
    
    facet.enableQueryHandler(handler);
    
    const message = createMessage('query/test', 'test-msg');
    const result = await facet._queryHandlerManager.processQuery(message);
    
    if (!result || result.data !== 'custom-result' || result.id !== 'test-msg') {
      return { success: false, error: 'Handler result should be returned correctly' };
    }
    
    return {
      success: true,
      message: 'processQuery returns handler result',
      data: { result }
    };
  };

  const testConfigurationDebug = () => {
    const facet = createQueriesFacet({ debug: true });
    
    if (facet._queryHandlerManager.isDebugEnabled() !== true) {
      return { success: false, error: 'Debug flag from config should be passed to QueryHandlerManager' };
    }
    
    return {
      success: true,
      message: 'Configuration debug flag is passed to QueryHandlerManager',
      data: { debug: facet._queryHandlerManager.isDebugEnabled() }
    };
  };

  const testConfigurationDefaultDebug = () => {
    const facet = createQueriesFacet();
    
    if (facet._queryHandlerManager.isDebugEnabled() !== false) {
      return { success: false, error: 'Default debug value should be false' };
    }
    
    return {
      success: true,
      message: 'Default debug value is false',
      data: { debug: facet._queryHandlerManager.isDebugEnabled() }
    };
  };

  const testFullWorkflow = async () => {
    const facet = createQueriesFacet();
    let processQueryCalled = false;
    
    const handler = createQueryHandler(async (message) => {
      processQueryCalled = true;
      return { success: true, data: message.id };
    });
    
    // Initial state
    if (facet.hasQueryHandler() !== false) {
      return { success: false, error: 'Should start with no handler' };
    }
    
    // Enable handler
    facet.enableQueryHandler(handler);
    if (facet.hasQueryHandler() !== true) {
      return { success: false, error: 'Handler should be enabled' };
    }
    if (!facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'Route should be registered' };
    }
    
    // Process query
    const message = createMessage('query/test', 'test-msg');
    const result = await facet._queryHandlerManager.processQuery(message);
    
    if (!processQueryCalled) {
      return { success: false, error: 'processQuery should be called' };
    }
    if (!result || result.data !== 'test-msg') {
      return { success: false, error: 'Handler result should be correct' };
    }
    
    // Disable handler
    facet.disableQueryHandler();
    if (facet.hasQueryHandler() !== false) {
      return { success: false, error: 'Handler should be disabled' };
    }
    if (facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'Route should be unregistered' };
    }
    
    return {
      success: true,
      message: 'Full workflow: enable → hasQueryHandler → processQuery → disable works correctly',
      data: { 
        handlerEnabled: true,
        routeRegistered: true,
        processQueryCalled: processQueryCalled,
        handlerDisabled: true,
        routeUnregistered: true
      }
    };
  };

  const testMultipleEnableDisableCycles = async () => {
    const facet = createQueriesFacet();
    const handler1 = createQueryHandler(async () => ({ success: true, handler: 1 }));
    const handler2 = createQueryHandler(async () => ({ success: true, handler: 2 }));
    
    // First cycle
    facet.enableQueryHandler(handler1);
    if (!facet.hasQueryHandler() || !facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'First enable should work' };
    }
    
    facet.disableQueryHandler();
    if (facet.hasQueryHandler() || facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'First disable should work' };
    }
    
    // Second cycle
    facet.enableQueryHandler(handler2);
    if (!facet.hasQueryHandler() || !facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'Second enable should work' };
    }
    
    const message = createMessage('query/test');
    const result = await facet._queryHandlerManager.processQuery(message);
    
    if (result.handler !== 2) {
      return { success: false, error: 'Second handler should be active' };
    }
    
    facet.disableQueryHandler();
    if (facet.hasQueryHandler() || facet._routerFacet.hasRoute('query/*')) {
      return { success: false, error: 'Second disable should work' };
    }
    
    return {
      success: true,
      message: 'Multiple enable/disable cycles work correctly',
      data: { cyclesCompleted: 2 }
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
          useQueries Tests
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





