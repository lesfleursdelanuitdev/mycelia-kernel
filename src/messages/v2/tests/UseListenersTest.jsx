import { useState } from 'react';
import { useListeners } from '../hooks/listeners/use-listeners.mycelia.js';
import { ListenerManager } from '../hooks/listeners/listener-manager.mycelia.js';

/**
 * UseListenersTest - React component test suite for useListeners hook
 * Tests the useListeners hook directly without building subsystems
 */
export function UseListenersTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a listeners facet with fresh mocks
  const createListenersFacet = (config = {}) => {
    const subsystem = { name: 'test-subsystem' };
    const api = { name: 'test-subsystem' };
    const ctx = { config: { listeners: config } };
    return useListeners(ctx, api, subsystem);
  };

  // Helper to create a simple handler function
  const createHandler = (name = 'handler') => {
    // Create a named function or use a property to track the name
    const handler = function handlerFunction() {};
    // Store name as a custom property since function.name is read-only
    handler._testName = name;
    return handler;
  };

  // Helper to create a handler group
  const createHandlerGroup = () => ({
    onSuccess: createHandler('onSuccess'),
    onFailure: createHandler('onFailure'),
    onTimeout: createHandler('onTimeout')
  });

  const testCases = [
    { name: 'Hook returns Facet', category: 'Initialization' },
    { name: 'Listeners disabled by default', category: 'Initialization' },
    { name: 'listeners getter returns null when disabled', category: 'Initialization' },
    { name: 'enableListeners() - creates ListenerManager', category: 'Enable/Disable' },
    { name: 'enableListeners() - sets hasListeners to true', category: 'Enable/Disable' },
    { name: 'enableListeners() - with options', category: 'Enable/Disable' },
    { name: 'enableListeners() - idempotent', category: 'Enable/Disable' },
    { name: 'disableListeners() - sets hasListeners to false', category: 'Enable/Disable' },
    { name: 'listeners getter returns ListenerManager when enabled', category: 'Enable/Disable' },
    { name: 'on() - returns false when disabled', category: 'Registration' },
    { name: 'on() - success when enabled', category: 'Registration' },
    { name: 'on() - delegates to ListenerManager', category: 'Registration' },
    { name: 'on() - with handler group', category: 'Registration' },
    { name: 'on() - validates handler function', category: 'Registration' },
    { name: 'off() - returns false when disabled', category: 'Unregistration' },
    { name: 'off() - success when enabled', category: 'Unregistration' },
    { name: 'off() - delegates to ListenerManager', category: 'Unregistration' },
    { name: 'off() - with handler group', category: 'Unregistration' },
    { name: 'off() - removes correct listener', category: 'Unregistration' },
    { name: 'off() - returns false for non-existent', category: 'Unregistration' },
    { name: 'Config options passed to ListenerManager', category: 'Configuration' },
    { name: 'enableListeners() options override config', category: 'Configuration' },
    { name: 'Multiple listeners on same path', category: 'Integration' },
    { name: 'ListenerManager statistics accessible', category: 'Integration' },
    { name: 'Full workflow: enable → register → unregister → disable', category: 'Integration' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(() => {
      try {
        let result;
        
        switch (testName) {
          case 'Hook returns Facet':
            result = testHookReturnsFacet();
            break;
          case 'Listeners disabled by default':
            result = testListenersDisabledByDefault();
            break;
          case 'listeners getter returns null when disabled':
            result = testListenersGetterWhenDisabled();
            break;
          case 'enableListeners() - creates ListenerManager':
            result = testEnableListenersCreatesManager();
            break;
          case 'enableListeners() - sets hasListeners to true':
            result = testEnableListenersSetsHasListeners();
            break;
          case 'enableListeners() - with options':
            result = testEnableListenersWithOptions();
            break;
          case 'enableListeners() - idempotent':
            result = testEnableListenersIdempotent();
            break;
          case 'disableListeners() - sets hasListeners to false':
            result = testDisableListeners();
            break;
          case 'listeners getter returns ListenerManager when enabled':
            result = testListenersGetterWhenEnabled();
            break;
          case 'on() - returns false when disabled':
            result = testOnWhenDisabled();
            break;
          case 'on() - success when enabled':
            result = testOnWhenEnabled();
            break;
          case 'on() - delegates to ListenerManager':
            result = testOnDelegatesToManager();
            break;
          case 'on() - with handler group':
            result = testOnWithHandlerGroup();
            break;
          case 'on() - validates handler function':
            result = testOnValidatesHandler();
            break;
          case 'off() - returns false when disabled':
            result = testOffWhenDisabled();
            break;
          case 'off() - success when enabled':
            result = testOffWhenEnabled();
            break;
          case 'off() - delegates to ListenerManager':
            result = testOffDelegatesToManager();
            break;
          case 'off() - with handler group':
            result = testOffWithHandlerGroup();
            break;
          case 'off() - removes correct listener':
            result = testOffRemovesCorrectListener();
            break;
          case 'off() - returns false for non-existent':
            result = testOffNonExistent();
            break;
          case 'Config options passed to ListenerManager':
            result = testConfigOptions();
            break;
          case 'enableListeners() options override config':
            result = testOptionsOverrideConfig();
            break;
          case 'Multiple listeners on same path':
            result = testMultipleListeners();
            break;
          case 'ListenerManager statistics accessible':
            result = testListenerManagerStats();
            break;
          case 'Full workflow: enable → register → unregister → disable':
            result = testFullWorkflow();
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
    const facet = createListenersFacet();
    
    if (!facet || typeof facet !== 'object') {
      return { success: false, error: 'Hook should return an object' };
    }
    if (facet.getKind() !== 'listeners') {
      return { success: false, error: `Facet kind should be 'listeners', got '${facet.getKind()}'` };
    }
    
    return {
      success: true,
      message: 'Hook returns a Facet with correct kind',
      data: { kind: facet.getKind() }
    };
  };

  const testListenersDisabledByDefault = () => {
    const facet = createListenersFacet();
    
    if (facet.hasListeners() !== false) {
      return { success: false, error: 'Listeners should be disabled by default' };
    }
    
    return {
      success: true,
      message: 'Listeners are disabled by default',
      data: { hasListeners: facet.hasListeners() }
    };
  };

  const testListenersGetterWhenDisabled = () => {
    const facet = createListenersFacet();
    
    if (facet.listeners !== null) {
      return { success: false, error: 'listeners getter should return null when disabled' };
    }
    
    return {
      success: true,
      message: 'listeners getter returns null when disabled',
      data: {}
    };
  };

  const testEnableListenersCreatesManager = () => {
    const facet = createListenersFacet();
    
    facet.enableListeners();
    
    if (!(facet.listeners instanceof ListenerManager)) {
      return { success: false, error: 'enableListeners should create ListenerManager' };
    }
    
    return {
      success: true,
      message: 'enableListeners creates ListenerManager instance',
      data: { managerType: facet.listeners.constructor.name }
    };
  };

  const testEnableListenersSetsHasListeners = () => {
    const facet = createListenersFacet();
    
    facet.enableListeners();
    
    if (facet.hasListeners() !== true) {
      return { success: false, error: 'enableListeners should set hasListeners to true' };
    }
    
    return {
      success: true,
      message: 'enableListeners sets hasListeners to true',
      data: { hasListeners: facet.hasListeners() }
    };
  };

  const testEnableListenersWithOptions = () => {
    const facet = createListenersFacet();
    
    facet.enableListeners({
      registrationPolicy: 'single',
      debug: true
    });
    
    const manager = facet.listeners;
    
    if (manager.registrationPolicy !== 'single') {
      return { success: false, error: 'enableListeners should accept registrationPolicy option' };
    }
    if (manager.debug !== true) {
      return { success: false, error: 'enableListeners should accept debug option' };
    }
    
    return {
      success: true,
      message: 'enableListeners accepts and applies options',
      data: { 
        policy: manager.registrationPolicy,
        debug: manager.debug
      }
    };
  };

  const testEnableListenersIdempotent = () => {
    const facet = createListenersFacet();
    
    facet.enableListeners();
    const manager1 = facet.listeners;
    
    facet.enableListeners();
    const manager2 = facet.listeners;
    
    if (manager1 !== manager2) {
      return { success: false, error: 'enableListeners should be idempotent (return same manager)' };
    }
    
    return {
      success: true,
      message: 'enableListeners is idempotent',
      data: {}
    };
  };

  const testDisableListeners = () => {
    const facet = createListenersFacet();
    
    facet.enableListeners();
    if (facet.hasListeners() !== true) {
      return { success: false, error: 'Should be enabled before disable test' };
    }
    
    facet.disableListeners();
    
    if (facet.hasListeners() !== false) {
      return { success: false, error: 'disableListeners should set hasListeners to false' };
    }
    
    // Manager should still exist (can re-enable)
    if (facet.listeners === null) {
      return { success: false, error: 'Manager should still exist after disable (for re-enable)' };
    }
    
    return {
      success: true,
      message: 'disableListeners sets hasListeners to false',
      data: { hasListeners: facet.hasListeners() }
    };
  };

  const testListenersGetterWhenEnabled = () => {
    const facet = createListenersFacet();
    
    facet.enableListeners();
    
    if (!(facet.listeners instanceof ListenerManager)) {
      return { success: false, error: 'listeners getter should return ListenerManager when enabled' };
    }
    
    return {
      success: true,
      message: 'listeners getter returns ListenerManager when enabled',
      data: { managerType: facet.listeners.constructor.name }
    };
  };

  const testOnWhenDisabled = () => {
    const facet = createListenersFacet();
    const handler = createHandler();
    
    const result = facet.on('test/path', handler);
    
    if (result !== false) {
      return { success: false, error: 'on() should return false when listeners disabled' };
    }
    
    return {
      success: true,
      message: 'on() returns false when listeners are disabled',
      data: {}
    };
  };

  const testOnWhenEnabled = () => {
    const facet = createListenersFacet();
    const handler = createHandler();
    
    facet.enableListeners();
    const result = facet.on('test/path', handler);
    
    if (result !== true) {
      return { success: false, error: 'on() should return true when listeners enabled' };
    }
    
    // Verify listener was actually registered
    if (!facet.listeners.hasListeners('test/path')) {
      return { success: false, error: 'Listener should be registered in ListenerManager' };
    }
    
    return {
      success: true,
      message: 'on() successfully registers listener when enabled',
      data: { path: 'test/path' }
    };
  };

  const testOnDelegatesToManager = () => {
    const facet = createListenersFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    
    facet.enableListeners();
    facet.on('test/path', handler1);
    facet.on('test/path', handler2);
    
    const listeners = facet.listeners.getListeners('test/path');
    
    if (listeners.length !== 2) {
      return { success: false, error: `Expected 2 listeners, got ${listeners.length}` };
    }
    if (!listeners.includes(handler1) || !listeners.includes(handler2)) {
      return { success: false, error: 'Listeners not correctly registered' };
    }
    
    return {
      success: true,
      message: 'on() delegates to ListenerManager correctly',
      data: { listenerCount: listeners.length }
    };
  };

  const testOnWithHandlerGroup = () => {
    const facet = createListenersFacet();
    const handlerGroup = createHandlerGroup();
    
    facet.enableListeners();
    const result = facet.on('test/path', handlerGroup, { isHandlerGroup: true });
    
    if (result !== true) {
      return { success: false, error: 'on() with handler group should return true' };
    }
    
    // Verify handler group was registered
    const listeners = facet.listeners.getListeners('test/path');
    if (listeners.length !== 1) {
      return { success: false, error: 'Handler group should be registered' };
    }
    
    const registeredHandler = listeners[0];
    if (!registeredHandler._isHandlerGroup) {
      return { success: false, error: 'Registered handler should be marked as handler group' };
    }
    if (registeredHandler.onSuccess !== handlerGroup.onSuccess ||
        registeredHandler.onFailure !== handlerGroup.onFailure ||
        registeredHandler.onTimeout !== handlerGroup.onTimeout) {
      return { success: false, error: 'Handler group properties not correctly attached' };
    }
    
    return {
      success: true,
      message: 'on() with handler group works correctly',
      data: { isHandlerGroup: registeredHandler._isHandlerGroup }
    };
  };

  const testOnValidatesHandler = () => {
    const facet = createListenersFacet();
    
    facet.enableListeners();
    
    try {
      facet.on('test/path', 'not-a-function');
      return { success: false, error: 'on() should throw error for non-function handler' };
    } catch (error) {
      if (!error.message.includes('Handler must be a function')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'on() validates handler is a function',
      data: {}
    };
  };

  const testOffWhenDisabled = () => {
    const facet = createListenersFacet();
    const handler = createHandler();
    
    const result = facet.off('test/path', handler);
    
    if (result !== false) {
      return { success: false, error: 'off() should return false when listeners disabled' };
    }
    
    return {
      success: true,
      message: 'off() returns false when listeners are disabled',
      data: {}
    };
  };

  const testOffWhenEnabled = () => {
    const facet = createListenersFacet();
    const handler = createHandler();
    
    facet.enableListeners();
    facet.on('test/path', handler);
    
    if (!facet.listeners.hasListeners('test/path')) {
      return { success: false, error: 'Listener should be registered before off test' };
    }
    
    const result = facet.off('test/path', handler);
    
    if (result !== true) {
      return { success: false, error: 'off() should return true when listener removed' };
    }
    
    if (facet.listeners.hasListeners('test/path')) {
      return { success: false, error: 'Listener should be removed from ListenerManager' };
    }
    
    return {
      success: true,
      message: 'off() successfully removes listener when enabled',
      data: {}
    };
  };

  const testOffDelegatesToManager = () => {
    const facet = createListenersFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    
    facet.enableListeners();
    facet.on('test/path', handler1);
    facet.on('test/path', handler2);
    
    facet.off('test/path', handler1);
    
    const listeners = facet.listeners.getListeners('test/path');
    
    if (listeners.length !== 1) {
      return { success: false, error: `Expected 1 listener remaining, got ${listeners.length}` };
    }
    if (!listeners.includes(handler2)) {
      return { success: false, error: 'Wrong listener removed' };
    }
    
    return {
      success: true,
      message: 'off() delegates to ListenerManager correctly',
      data: { remainingCount: listeners.length }
    };
  };

  const testOffWithHandlerGroup = () => {
    const facet = createListenersFacet();
    const handlerGroup = createHandlerGroup();
    
    facet.enableListeners();
    facet.on('test/path', handlerGroup, { isHandlerGroup: true });
    
    if (!facet.listeners.hasListeners('test/path')) {
      return { success: false, error: 'Handler group should be registered before off test' };
    }
    
    const result = facet.off('test/path', handlerGroup, { isHandlerGroup: true });
    
    if (result !== true) {
      return { success: false, error: 'off() with handler group should return true' };
    }
    
    if (facet.listeners.hasListeners('test/path')) {
      return { success: false, error: 'Handler group should be removed' };
    }
    
    return {
      success: true,
      message: 'off() with handler group works correctly',
      data: {}
    };
  };

  const testOffRemovesCorrectListener = () => {
    const facet = createListenersFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    const handler3 = createHandler('handler3');
    
    facet.enableListeners();
    facet.on('test/path', handler1);
    facet.on('test/path', handler2);
    facet.on('test/path', handler3);
    
    facet.off('test/path', handler2);
    
    const listeners = facet.listeners.getListeners('test/path');
    
    if (listeners.length !== 2) {
      return { success: false, error: `Expected 2 listeners remaining, got ${listeners.length}` };
    }
    if (listeners.includes(handler2)) {
      return { success: false, error: 'handler2 should be removed' };
    }
    if (!listeners.includes(handler1) || !listeners.includes(handler3)) {
      return { success: false, error: 'Other handlers should remain' };
    }
    
    return {
      success: true,
      message: 'off() removes correct listener',
      data: { remainingCount: listeners.length, remaining: listeners.map(h => h.name) }
    };
  };

  const testOffNonExistent = () => {
    const facet = createListenersFacet();
    const handler = createHandler();
    
    facet.enableListeners();
    
    const result = facet.off('test/path', handler);
    
    if (result !== false) {
      return { success: false, error: 'off() should return false for non-existent listener' };
    }
    
    return {
      success: true,
      message: 'off() returns false for non-existent listener',
      data: {}
    };
  };

  const testConfigOptions = () => {
    const facet = createListenersFacet({
      registrationPolicy: 'single',
      debug: true,
      policyOptions: { maxListeners: 5 }
    });
    
    facet.enableListeners();
    const manager = facet.listeners;
    
    if (manager.registrationPolicy !== 'single') {
      return { success: false, error: 'Config registrationPolicy should be used' };
    }
    if (manager.debug !== true) {
      return { success: false, error: 'Config debug should be used' };
    }
    
    return {
      success: true,
      message: 'Config options passed to ListenerManager',
      data: { 
        policy: manager.registrationPolicy,
        debug: manager.debug
      }
    };
  };

  const testOptionsOverrideConfig = () => {
    const facet = createListenersFacet({
      registrationPolicy: 'multiple',
      debug: false
    });
    
    facet.enableListeners({
      registrationPolicy: 'single',
      debug: true
    });
    
    const manager = facet.listeners;
    
    if (manager.registrationPolicy !== 'single') {
      return { success: false, error: 'Options should override config registrationPolicy' };
    }
    if (manager.debug !== true) {
      return { success: false, error: 'Options should override config debug' };
    }
    
    return {
      success: true,
      message: 'enableListeners() options override config',
      data: { 
        policy: manager.registrationPolicy,
        debug: manager.debug
      }
    };
  };

  const testMultipleListeners = () => {
    const facet = createListenersFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    const handler3 = createHandler('handler3');
    
    facet.enableListeners();
    facet.on('test/path', handler1);
    facet.on('test/path', handler2);
    facet.on('test/path', handler3);
    
    const listeners = facet.listeners.getListeners('test/path');
    const count = facet.listeners.getListenerCount('test/path');
    
    if (listeners.length !== 3) {
      return { success: false, error: `Expected 3 listeners, got ${listeners.length}` };
    }
    if (count !== 3) {
      return { success: false, error: `Expected count 3, got ${count}` };
    }
    
    return {
      success: true,
      message: 'Multiple listeners can be registered on same path',
      data: { listenerCount: listeners.length, count: count }
    };
  };

  const testListenerManagerStats = () => {
    const facet = createListenersFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    
    facet.enableListeners();
    facet.on('test/path1', handler1);
    facet.on('test/path2', handler2);
    
    const stats = facet.listeners.getStatistics();
    
    if (typeof stats !== 'object') {
      return { success: false, error: 'getStatistics should return an object' };
    }
    if (stats.listenersRegistered !== 2) {
      return { success: false, error: `Expected 2 registered, got ${stats.listenersRegistered}` };
    }
    if (stats.totalListeners !== 2) {
      return { success: false, error: `Expected 2 total listeners, got ${stats.totalListeners}` };
    }
    
    return {
      success: true,
      message: 'ListenerManager statistics are accessible',
      data: { 
        registered: stats.listenersRegistered,
        total: stats.totalListeners
      }
    };
  };

  const testFullWorkflow = () => {
    const facet = createListenersFacet();
    const handler1 = createHandler('handler1');
    const handler2 = createHandler('handler2');
    
    // Start disabled
    if (facet.hasListeners() !== false) {
      return { success: false, error: 'Should start disabled' };
    }
    
    // Enable
    facet.enableListeners();
    if (facet.hasListeners() !== true) {
      return { success: false, error: 'Should be enabled' };
    }
    
    // Register listeners
    facet.on('test/path', handler1);
    facet.on('test/path', handler2);
    
    if (facet.listeners.getListenerCount('test/path') !== 2) {
      return { success: false, error: 'Should have 2 listeners' };
    }
    
    // Unregister one
    facet.off('test/path', handler1);
    
    if (facet.listeners.getListenerCount('test/path') !== 1) {
      return { success: false, error: 'Should have 1 listener after unregister' };
    }
    
    // Disable
    facet.disableListeners();
    if (facet.hasListeners() !== false) {
      return { success: false, error: 'Should be disabled' };
    }
    
    // on() should return false when disabled
    const result = facet.on('test/path', createHandler());
    if (result !== false) {
      return { success: false, error: 'on() should return false when disabled' };
    }
    
    return {
      success: true,
      message: 'Full workflow: enable → register → unregister → disable works correctly',
      data: { 
        finalListenerCount: facet.listeners.getListenerCount('test/path')
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
          useListeners Tests
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

