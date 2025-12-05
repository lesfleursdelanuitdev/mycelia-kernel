import { useState } from 'react';
import { useRouter } from '../hooks/router/use-router.mycelia.js';
import { SubsystemRouter } from '../hooks/router/subsystem-router.mycelia.js';

/**
 * UseRouterTest - React component test suite for useRouter hook
 * Tests the useRouter hook directly without building subsystems
 */
export function UseRouterTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a router facet with fresh mocks
  const createRouterFacet = (config = {}) => {
    const subsystem = { name: 'test-subsystem' };
    const api = { name: 'test-subsystem' };
    const ctx = { config: { router: config } };
    return useRouter(ctx, api, subsystem);
  };

  // Helper to create a mock message
  const createMessage = (path) => ({
    getPath: () => path,
    getBody: () => ({})
  });

  // Helper to create a handler function
  const createHandler = (name = 'handler') => {
    const handler = async (message, params, options) => {
      return { message, params, options, handlerName: name };
    };
    handler._testName = name;
    return handler;
  };

  const testCases = [
    { name: 'Hook returns Facet', category: 'Initialization' },
    { name: 'Router instance created immediately', category: 'Initialization' },
    { name: '_routeRegistry is SubsystemRouter instance', category: 'Initialization' },
    { name: 'registerRoute() - success', category: 'Route Registration' },
    { name: 'registerRoute() - duplicate pattern error', category: 'Route Registration' },
    { name: 'registerRoute() - invalid pattern error', category: 'Route Registration' },
    { name: 'registerRoute() - invalid handler error', category: 'Route Registration' },
    { name: 'registerRoute() - with route options', category: 'Route Registration' },
    { name: 'registerRoutes() - success', category: 'Route Registration' },
    { name: 'registerRoutes() - with invalid routes', category: 'Route Registration' },
    { name: 'registerRoutes() - non-array error', category: 'Route Registration' },
    { name: 'unregisterRoute() - success', category: 'Route Unregistration' },
    { name: 'unregisterRoute() - not found', category: 'Route Unregistration' },
    { name: 'hasRoute() - true', category: 'Route Queries' },
    { name: 'hasRoute() - false', category: 'Route Queries' },
    { name: 'getRoutes() - returns routes', category: 'Route Queries' },
    { name: 'getRoutes() - empty when no routes', category: 'Route Queries' },
    { name: 'match() - static pattern', category: 'Route Matching' },
    { name: 'match() - pattern with params', category: 'Route Matching' },
    { name: 'match() - wildcard pattern', category: 'Route Matching' },
    { name: 'match() - no match returns null', category: 'Route Matching' },
    { name: 'match() - invalid path returns null', category: 'Route Matching' },
    { name: 'match() - longest pattern wins', category: 'Route Matching' },
    { name: 'route() - success', category: 'Message Routing' },
    { name: 'route() - no match error', category: 'Message Routing' },
    { name: 'route() - invalid message error', category: 'Message Routing' },
    { name: 'Configuration - cacheCapacity and debug', category: 'Configuration' },
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
          case 'Router instance created immediately':
            result = testRouterInstanceCreated();
            break;
          case '_routeRegistry is SubsystemRouter instance':
            result = testRouteRegistryType();
            break;
          case 'registerRoute() - success':
            result = testRegisterRouteSuccess();
            break;
          case 'registerRoute() - duplicate pattern error':
            result = testRegisterRouteDuplicate();
            break;
          case 'registerRoute() - invalid pattern error':
            result = testRegisterRouteInvalidPattern();
            break;
          case 'registerRoute() - invalid handler error':
            result = testRegisterRouteInvalidHandler();
            break;
          case 'registerRoute() - with route options':
            result = testRegisterRouteWithOptions();
            break;
          case 'registerRoutes() - success':
            result = testRegisterRoutesSuccess();
            break;
          case 'registerRoutes() - with invalid routes':
            result = testRegisterRoutesWithInvalid();
            break;
          case 'registerRoutes() - non-array error':
            result = testRegisterRoutesNonArray();
            break;
          case 'unregisterRoute() - success':
            result = testUnregisterRouteSuccess();
            break;
          case 'unregisterRoute() - not found':
            result = testUnregisterRouteNotFound();
            break;
          case 'hasRoute() - true':
            result = testHasRouteTrue();
            break;
          case 'hasRoute() - false':
            result = testHasRouteFalse();
            break;
          case 'getRoutes() - returns routes':
            result = testGetRoutes();
            break;
          case 'getRoutes() - empty when no routes':
            result = testGetRoutesEmpty();
            break;
          case 'match() - static pattern':
            result = testMatchStaticPattern();
            break;
          case 'match() - pattern with params':
            result = testMatchPatternWithParams();
            break;
          case 'match() - wildcard pattern':
            result = testMatchWildcardPattern();
            break;
          case 'match() - no match returns null':
            result = testMatchNoMatch();
            break;
          case 'match() - invalid path returns null':
            result = testMatchInvalidPath();
            break;
          case 'match() - longest pattern wins':
            result = testMatchLongestPatternWins();
            break;
          case 'route() - success':
            result = await testRouteSuccess();
            break;
          case 'route() - no match error':
            result = await testRouteNoMatch();
            break;
          case 'route() - invalid message error':
            result = await testRouteInvalidMessage();
            break;
          case 'Configuration - cacheCapacity and debug':
            result = testConfiguration();
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
    const facet = createRouterFacet();
    
    if (!facet || typeof facet !== 'object') {
      return { success: false, error: 'Hook should return an object' };
    }
    if (facet.getKind() !== 'router') {
      return { success: false, error: `Facet kind should be 'router', got '${facet.getKind()}'` };
    }
    
    return {
      success: true,
      message: 'Hook returns a Facet with correct kind',
      data: { kind: facet.getKind() }
    };
  };

  const testRouterInstanceCreated = () => {
    const facet = createRouterFacet();
    
    if (!facet._routeRegistry) {
      return { success: false, error: 'Router instance should be created immediately' };
    }
    
    return {
      success: true,
      message: 'Router instance is created immediately',
      data: {}
    };
  };

  const testRouteRegistryType = () => {
    const facet = createRouterFacet();
    
    if (!(facet._routeRegistry instanceof SubsystemRouter)) {
      return { success: false, error: '_routeRegistry should be a SubsystemRouter instance' };
    }
    
    return {
      success: true,
      message: '_routeRegistry is a SubsystemRouter instance',
      data: { instanceType: facet._routeRegistry.constructor.name }
    };
  };

  const testRegisterRouteSuccess = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    const result = facet.registerRoute('test/path', handler);
    
    if (result !== true) {
      return { success: false, error: 'registerRoute should return true on success' };
    }
    if (!facet.hasRoute('test/path')) {
      return { success: false, error: 'Route should be registered' };
    }
    
    return {
      success: true,
      message: 'registerRoute successfully registers route',
      data: { pattern: 'test/path' }
    };
  };

  const testRegisterRouteDuplicate = () => {
    const facet = createRouterFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    
    facet.registerRoute('test/path', handler1);
    
    try {
      facet.registerRoute('test/path', handler2);
      return { success: false, error: 'registerRoute should throw error for duplicate pattern' };
    } catch (error) {
      if (!error.message.includes('already registered')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'registerRoute throws error for duplicate pattern',
      data: {}
    };
  };

  const testRegisterRouteInvalidPattern = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    // Test empty string
    try {
      facet.registerRoute('', handler);
      return { success: false, error: 'registerRoute should throw error for empty pattern' };
    } catch (error) {
      if (!error.message.includes('pattern must be')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    // Test non-string
    try {
      facet.registerRoute(null, handler);
      return { success: false, error: 'registerRoute should throw error for non-string pattern' };
    } catch (error) {
      // Should throw
    }
    
    return {
      success: true,
      message: 'registerRoute validates pattern input correctly',
      data: {}
    };
  };

  const testRegisterRouteInvalidHandler = () => {
    const facet = createRouterFacet();
    
    try {
      facet.registerRoute('test/path', 'not-a-function');
      return { success: false, error: 'registerRoute should throw error for non-function handler' };
    } catch (error) {
      if (!error.message.includes('handler must be a function')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'registerRoute validates handler is a function',
      data: {}
    };
  };

  const testRegisterRouteWithOptions = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    const result = facet.registerRoute('test/path', handler, {
      priority: 10,
      description: 'Test route',
      metadata: { custom: 'value' }
    });
    
    if (result !== true) {
      return { success: false, error: 'registerRoute should return true with options' };
    }
    
    const routes = facet.getRoutes();
    if (routes.length !== 1) {
      return { success: false, error: 'Route should be registered' };
    }
    
    const route = routes[0];
    if (route.metadata.priority !== 10 || route.metadata.description !== 'Test route') {
      return { success: false, error: 'Route options should be stored in metadata' };
    }
    
    return {
      success: true,
      message: 'registerRoute accepts and stores route options',
      data: { 
        priority: route.metadata.priority,
        description: route.metadata.description
      }
    };
  };

  const testRegisterRoutesSuccess = () => {
    const facet = createRouterFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    
    const routes = [
      { pattern: 'route1', handler: handler1 },
      { pattern: 'route2', handler: handler2 }
    ];
    
    const count = facet.registerRoutes(routes);
    
    if (count !== 2) {
      return { success: false, error: `Expected 2 routes registered, got ${count}` };
    }
    if (!facet.hasRoute('route1') || !facet.hasRoute('route2')) {
      return { success: false, error: 'Routes should be registered' };
    }
    
    return {
      success: true,
      message: 'registerRoutes successfully registers multiple routes',
      data: { registeredCount: count }
    };
  };

  const testRegisterRoutesWithInvalid = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    const routes = [
      { pattern: 'valid', handler: handler },
      { pattern: '', handler: handler }, // Invalid pattern
      { handler: handler }, // Missing pattern
      { pattern: 'valid2', handler: 'not-a-function' }, // Invalid handler
      { pattern: 'valid3', handler: handler } // Valid
    ];
    
    const count = facet.registerRoutes(routes);
    
    // Should register 2 valid routes, skip 3 invalid ones
    if (count !== 2) {
      return { success: false, error: `Expected 2 routes registered, got ${count}` };
    }
    if (!facet.hasRoute('valid') || !facet.hasRoute('valid3')) {
      return { success: false, error: 'Valid routes should be registered' };
    }
    
    return {
      success: true,
      message: 'registerRoutes skips invalid routes and continues',
      data: { registeredCount: count }
    };
  };

  const testRegisterRoutesNonArray = () => {
    const facet = createRouterFacet();
    
    try {
      facet.registerRoutes('not-an-array');
      return { success: false, error: 'registerRoutes should throw error for non-array' };
    } catch (error) {
      if (!error.message.includes('requires an array')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'registerRoutes validates input is an array',
      data: {}
    };
  };

  const testUnregisterRouteSuccess = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    facet.registerRoute('test/path', handler);
    if (!facet.hasRoute('test/path')) {
      return { success: false, error: 'Route should be registered before unregister test' };
    }
    
    const result = facet.unregisterRoute('test/path');
    
    if (result !== true) {
      return { success: false, error: 'unregisterRoute should return true when route found' };
    }
    if (facet.hasRoute('test/path')) {
      return { success: false, error: 'Route should be unregistered' };
    }
    
    return {
      success: true,
      message: 'unregisterRoute successfully removes route',
      data: {}
    };
  };

  const testUnregisterRouteNotFound = () => {
    const facet = createRouterFacet();
    
    const result = facet.unregisterRoute('nonexistent');
    
    if (result !== false) {
      return { success: false, error: 'unregisterRoute should return false when route not found' };
    }
    
    return {
      success: true,
      message: 'unregisterRoute returns false for non-existent route',
      data: {}
    };
  };

  const testHasRouteTrue = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    facet.registerRoute('test/path', handler);
    const hasRoute = facet.hasRoute('test/path');
    
    if (hasRoute !== true) {
      return { success: false, error: 'hasRoute should return true for registered route' };
    }
    
    return {
      success: true,
      message: 'hasRoute returns true for registered route',
      data: {}
    };
  };

  const testHasRouteFalse = () => {
    const facet = createRouterFacet();
    
    const hasRoute = facet.hasRoute('nonexistent');
    
    if (hasRoute !== false) {
      return { success: false, error: 'hasRoute should return false for unregistered route' };
    }
    
    return {
      success: true,
      message: 'hasRoute returns false for unregistered route',
      data: {}
    };
  };

  const testGetRoutes = () => {
    const facet = createRouterFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    
    facet.registerRoute('route1', handler1);
    facet.registerRoute('route2', handler2);
    
    const routes = facet.getRoutes();
    
    if (!Array.isArray(routes)) {
      return { success: false, error: 'getRoutes should return an array' };
    }
    if (routes.length !== 2) {
      return { success: false, error: `Expected 2 routes, got ${routes.length}` };
    }
    
    // Verify routes contain expected patterns
    const patterns = routes.map(r => r.pattern);
    if (!patterns.includes('route1') || !patterns.includes('route2')) {
      return { success: false, error: 'Routes should contain registered patterns' };
    }
    
    return {
      success: true,
      message: 'getRoutes returns all registered routes',
      data: { routeCount: routes.length, patterns }
    };
  };

  const testGetRoutesEmpty = () => {
    const facet = createRouterFacet();
    
    const routes = facet.getRoutes();
    
    if (!Array.isArray(routes)) {
      return { success: false, error: 'getRoutes should return an array' };
    }
    if (routes.length !== 0) {
      return { success: false, error: `Expected empty array, got ${routes.length}` };
    }
    
    return {
      success: true,
      message: 'getRoutes returns empty array when no routes',
      data: { routeCount: routes.length }
    };
  };

  const testMatchStaticPattern = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    facet.registerRoute('user/profile', handler);
    const match = facet.match('user/profile');
    
    if (!match) {
      return { success: false, error: 'match should return result for static pattern' };
    }
    if (match.handler !== handler) {
      return { success: false, error: 'Match should return correct handler' };
    }
    if (!match.params || Object.keys(match.params).length !== 0) {
      return { success: false, error: 'Static pattern should have no params' };
    }
    
    return {
      success: true,
      message: 'match correctly matches static pattern',
      data: { pattern: 'user/profile', hasParams: Object.keys(match.params).length === 0 }
    };
  };

  const testMatchPatternWithParams = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    facet.registerRoute('user/{id}', handler);
    const match = facet.match('user/123');
    
    if (!match) {
      return { success: false, error: 'match should return result for pattern with params' };
    }
    if (match.handler !== handler) {
      return { success: false, error: 'Match should return correct handler' };
    }
    if (!match.params || match.params.id !== '123') {
      return { success: false, error: `Expected params.id to be '123', got ${match.params?.id}` };
    }
    
    return {
      success: true,
      message: 'match correctly extracts params from pattern',
      data: { params: match.params }
    };
  };

  const testMatchWildcardPattern = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    facet.registerRoute('posts/*', handler);
    const match = facet.match('posts/anything/here');
    
    if (!match) {
      return { success: false, error: 'match should return result for wildcard pattern' };
    }
    if (match.handler !== handler) {
      return { success: false, error: 'Match should return correct handler' };
    }
    
    return {
      success: true,
      message: 'match correctly matches wildcard pattern',
      data: { pattern: 'posts/*', matchedPath: 'posts/anything/here' }
    };
  };

  const testMatchNoMatch = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    facet.registerRoute('user/profile', handler);
    const match = facet.match('user/settings');
    
    if (match !== null) {
      return { success: false, error: 'match should return null for no match' };
    }
    
    return {
      success: true,
      message: 'match returns null when no route matches',
      data: {}
    };
  };

  const testMatchInvalidPath = () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    facet.registerRoute('test/path', handler);
    
    // Test null
    if (facet.match(null) !== null) {
      return { success: false, error: 'match should return null for null path' };
    }
    
    // Test empty string
    if (facet.match('') !== null) {
      return { success: false, error: 'match should return null for empty path' };
    }
    
    // Test non-string
    if (facet.match(123) !== null) {
      return { success: false, error: 'match should return null for non-string path' };
    }
    
    return {
      success: true,
      message: 'match returns null for invalid paths',
      data: {}
    };
  };

  const testMatchLongestPatternWins = () => {
    const facet = createRouterFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    
    // Register shorter pattern first
    facet.registerRoute('user/{id}', handler1);
    // Register longer pattern
    facet.registerRoute('user/{id}/profile', handler2);
    
    // Match should use longer pattern
    const match = facet.match('user/123/profile');
    
    if (!match) {
      return { success: false, error: 'match should return result' };
    }
    if (match.handler !== handler2) {
      return { success: false, error: 'Longest pattern should win' };
    }
    if (match.params.id !== '123') {
      return { success: false, error: 'Params should be extracted correctly' };
    }
    
    return {
      success: true,
      message: 'match uses longest matching pattern',
      data: { handler: match.handler._testName, params: match.params }
    };
  };

  const testRouteSuccess = async () => {
    const facet = createRouterFacet();
    const handler = createHandler('test-handler');
    const message = createMessage('test/path');
    
    facet.registerRoute('test/path', handler);
    const result = await facet.route(message);
    
    if (!result || result.handlerName !== 'test-handler') {
      return { success: false, error: 'route should execute handler and return result' };
    }
    if (result.message !== message) {
      return { success: false, error: 'Handler should receive message' };
    }
    
    return {
      success: true,
      message: 'route successfully executes handler',
      data: { handlerName: result.handlerName }
    };
  };

  const testRouteNoMatch = async () => {
    const facet = createRouterFacet();
    const message = createMessage('nonexistent/path');
    
    try {
      await facet.route(message);
      return { success: false, error: 'route should throw error when no route matches' };
    } catch (error) {
      if (!error.message.includes('No route handler found')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'route throws error when no route matches',
      data: {}
    };
  };

  const testRouteInvalidMessage = async () => {
    const facet = createRouterFacet();
    const handler = createHandler();
    
    facet.registerRoute('test/path', handler);
    
    // Test message without getPath
    try {
      await facet.route({});
      return { success: false, error: 'route should throw error for message without getPath' };
    } catch (error) {
      if (!error.message.includes('getPath')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    // Test message with getPath returning empty string
    try {
      const message = { getPath: () => '' };
      await facet.route(message);
      return { success: false, error: 'route should throw error for empty path' };
    } catch (error) {
      if (!error.message.includes('non-empty string')) {
        return { success: false, error: `Wrong error message for empty path: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'route validates message input correctly',
      data: {}
    };
  };

  const testConfiguration = () => {
    const facet = createRouterFacet({
      cacheCapacity: 500,
      debug: true
    });
    
    const router = facet._routeRegistry;
    
    // Check that router was created with correct options
    // Note: SubsystemRouter doesn't expose cacheCapacity directly, but we can check debug
    if (router.debug !== true) {
      return { success: false, error: 'Debug flag from config should be passed to SubsystemRouter' };
    }
    
    // Test with different config
    const facet2 = createRouterFacet({
      cacheCapacity: 2000,
      debug: false
    });
    
    if (facet2._routeRegistry.debug !== false) {
      return { success: false, error: 'Debug flag false should be passed to SubsystemRouter' };
    }
    
    return {
      success: true,
      message: 'Configuration options are passed to SubsystemRouter',
      data: { 
        debugEnabled: router.debug,
        debugDisabled: facet2._routeRegistry.debug
      }
    };
  };

  const testFullWorkflow = async () => {
    const facet = createRouterFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    
    // Initial state
    if (facet.getRoutes().length !== 0) {
      return { success: false, error: 'Should start with no routes' };
    }
    
    // Register routes
    facet.registerRoute('user/{id}', handler1);
    facet.registerRoute('user/{id}/profile', handler2);
    
    if (facet.getRoutes().length !== 2) {
      return { success: false, error: 'Should have 2 routes registered' };
    }
    
    // Test hasRoute
    if (!facet.hasRoute('user/{id}')) {
      return { success: false, error: 'hasRoute should return true for registered route' };
    }
    
    // Test match
    const match = facet.match('user/123/profile');
    if (!match || match.handler !== handler2) {
      return { success: false, error: 'match should return longest pattern' };
    }
    
    // Test route
    const message = createMessage('user/123');
    const result = await facet.route(message);
    if (!result || result.handlerName !== 'handler1') {
      return { success: false, error: 'route should execute correct handler' };
    }
    
    // Test unregister
    facet.unregisterRoute('user/{id}');
    if (facet.hasRoute('user/{id}')) {
      return { success: false, error: 'Route should be unregistered' };
    }
    if (facet.getRoutes().length !== 1) {
      return { success: false, error: 'Should have 1 route after unregister' };
    }
    
    return {
      success: true,
      message: 'Full workflow: register → hasRoute → match → route → unregister works correctly',
      data: { 
        finalRouteCount: facet.getRoutes().length,
        remainingPattern: facet.getRoutes()[0].pattern
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
          useRouter Tests
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

