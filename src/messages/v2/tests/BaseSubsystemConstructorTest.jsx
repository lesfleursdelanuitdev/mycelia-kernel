import { useState } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';

/**
 * BaseSubsystemConstructorTest
 * Tests for BaseSubsystem constructor validation and initialization
 */
export function BaseSubsystemConstructorTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock MessageSystem
  const createMockMessageSystem = () => {
    return { name: 'mock-ms', id: 'ms-1' };
  };

  const testCases = [
    { name: 'Constructor - throws error for null name', category: 'Constructor' },
    { name: 'Constructor - throws error for empty string name', category: 'Constructor' },
    { name: 'Constructor - throws error for non-string name', category: 'Constructor' },
    { name: 'Constructor - throws error for missing options.ms', category: 'Constructor' },
    { name: 'Constructor - throws error for undefined options.ms', category: 'Constructor' },
    { name: 'Constructor - accepts valid name and options', category: 'Constructor' },
    { name: 'Constructor - initializes with default values', category: 'Constructor' },
    { name: 'Constructor - initializes ctx with ms, config, and debug', category: 'Constructor' },
    { name: 'Constructor - initializes debug property (legacy)', category: 'Constructor' },
    { name: 'Constructor - initializes empty hooks array', category: 'Constructor' },
    { name: 'Constructor - creates SubsystemBuilder instance', category: 'Constructor' },
    { name: 'Constructor - creates FacetManager instance', category: 'Constructor' },
    { name: 'Constructor - initializes api object with name and __facets', category: 'Constructor' },
    { name: 'Constructor - sets coreProcessor to null initially', category: 'Constructor' },
    { name: 'Constructor - sets _isBuilt to false initially', category: 'Constructor' },
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
          case 'Constructor - throws error for null name':
            result = await testConstructorThrowsErrorForNullName();
            break;
          case 'Constructor - throws error for empty string name':
            result = await testConstructorThrowsErrorForEmptyName();
            break;
          case 'Constructor - throws error for non-string name':
            result = await testConstructorThrowsErrorForNonStringName();
            break;
          case 'Constructor - throws error for missing options.ms':
            result = await testConstructorThrowsErrorForMissingMs();
            break;
          case 'Constructor - throws error for undefined options.ms':
            result = await testConstructorThrowsErrorForUndefinedMs();
            break;
          case 'Constructor - accepts valid name and options':
            result = await testConstructorAcceptsValid();
            break;
          case 'Constructor - initializes with default values':
            result = await testConstructorInitializesDefaults();
            break;
          case 'Constructor - initializes ctx with ms, config, and debug':
            result = await testConstructorInitializesCtx();
            break;
          case 'Constructor - initializes debug property (legacy)':
            result = await testConstructorInitializesDebug();
            break;
          case 'Constructor - initializes empty hooks array':
            result = await testConstructorInitializesHooks();
            break;
          case 'Constructor - creates SubsystemBuilder instance':
            result = await testConstructorCreatesBuilder();
            break;
          case 'Constructor - creates FacetManager instance':
            result = await testConstructorCreatesFacetManager();
            break;
          case 'Constructor - initializes api object with name and __facets':
            result = await testConstructorInitializesApi();
            break;
          case 'Constructor - sets coreProcessor to null initially':
            result = await testConstructorSetsCoreProcessor();
            break;
          case 'Constructor - sets _isBuilt to false initially':
            result = await testConstructorSetsIsBuilt();
            break;
          default:
            result = { success: false, error: 'Unknown test case' };
        }

        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          error: result.error,
          message: result.message,
          data: result.data
        }));
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: false,
          error: error.message || String(error)
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

  // Test functions
  const testConstructorThrowsErrorForNullName = async () => {
    try {
      new BaseSubsystem(null, { ms: createMockMessageSystem() });
      return { success: false, error: 'Should throw error for null name' };
    } catch (error) {
      if (error.message.includes('name must be a non-empty string')) {
        return { success: true, message: 'Throws error for null name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForEmptyName = async () => {
    try {
      new BaseSubsystem('', { ms: createMockMessageSystem() });
      return { success: false, error: 'Should throw error for empty name' };
    } catch (error) {
      if (error.message.includes('name must be a non-empty string')) {
        return { success: true, message: 'Throws error for empty name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForNonStringName = async () => {
    try {
      new BaseSubsystem(123, { ms: createMockMessageSystem() });
      return { success: false, error: 'Should throw error for non-string name' };
    } catch (error) {
      if (error.message.includes('name must be a non-empty string')) {
        return { success: true, message: 'Throws error for non-string name' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForMissingMs = async () => {
    try {
      new BaseSubsystem('test', {});
      return { success: false, error: 'Should throw error for missing ms' };
    } catch (error) {
      if (error.message.includes('options.ms is required')) {
        return { success: true, message: 'Throws error for missing ms' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorThrowsErrorForUndefinedMs = async () => {
    try {
      new BaseSubsystem('test', { ms: undefined });
      return { success: false, error: 'Should throw error for undefined ms' };
    } catch (error) {
      if (error.message.includes('options.ms is required')) {
        return { success: true, message: 'Throws error for undefined ms' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testConstructorAcceptsValid = async () => {
    try {
      const ms = createMockMessageSystem();
      const subsystem = new BaseSubsystem('test', { ms });
      if (!subsystem) {
        return { success: false, error: 'Subsystem should be created' };
      }
      if (subsystem.name !== 'test') {
        return { success: false, error: 'Name should be set correctly' };
      }
      return { success: true, message: 'Accepts valid name and options' };
    } catch (error) {
      return { success: false, error: `Should accept valid input: ${error.message}` };
    }
  };

  const testConstructorInitializesDefaults = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    
    if (subsystem.hooks.length !== 0) {
      return { success: false, error: 'hooks should be empty array' };
    }
    if (subsystem.coreProcessor !== null) {
      return { success: false, error: 'coreProcessor should be null' };
    }
    if (subsystem._isBuilt !== false) {
      return { success: false, error: '_isBuilt should be false' };
    }
    
    return { success: true, message: 'Initializes with default values' };
  };

  const testConstructorInitializesCtx = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms, config: { test: 'value' }, debug: true });
    
    if (subsystem.ctx.ms !== ms) {
      return { success: false, error: 'ctx.ms should be set' };
    }
    if (subsystem.ctx.config.test !== 'value') {
      return { success: false, error: 'ctx.config should be set' };
    }
    if (subsystem.ctx.debug !== true) {
      return { success: false, error: 'ctx.debug should be set' };
    }
    
    return { success: true, message: 'Initializes ctx correctly' };
  };

  const testConstructorInitializesDebug = async () => {
    const ms = createMockMessageSystem();
    const subsystem1 = new BaseSubsystem('test1', { ms, debug: true });
    const subsystem2 = new BaseSubsystem('test2', { ms, debug: false });
    
    if (subsystem1.debug !== true) {
      return { success: false, error: 'debug should be true' };
    }
    if (subsystem2.debug !== false) {
      return { success: false, error: 'debug should be false' };
    }
    
    return { success: true, message: 'Initializes debug property (legacy)' };
  };

  const testConstructorInitializesHooks = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    
    if (!Array.isArray(subsystem.hooks)) {
      return { success: false, error: 'hooks should be an array' };
    }
    if (subsystem.hooks.length !== 0) {
      return { success: false, error: 'hooks should be empty' };
    }
    
    return { success: true, message: 'Initializes empty hooks array' };
  };

  const testConstructorCreatesBuilder = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    
    if (!subsystem._builder) {
      return { success: false, error: '_builder should be created' };
    }
    if (typeof subsystem._builder.plan !== 'function') {
      return { success: false, error: '_builder should be SubsystemBuilder instance' };
    }
    
    return { success: true, message: 'Creates SubsystemBuilder instance' };
  };

  const testConstructorCreatesFacetManager = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    
    if (!subsystem.api.__facets) {
      return { success: false, error: 'api.__facets should be created' };
    }
    if (typeof subsystem.api.__facets.find !== 'function') {
      return { success: false, error: 'api.__facets should be FacetManager instance' };
    }
    
    return { success: true, message: 'Creates FacetManager instance' };
  };

  const testConstructorInitializesApi = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    
    if (subsystem.api.name !== 'test') {
      return { success: false, error: 'api.name should be set' };
    }
    if (!subsystem.api.__facets) {
      return { success: false, error: 'api.__facets should be set' };
    }
    
    return { success: true, message: 'Initializes api object correctly' };
  };

  const testConstructorSetsCoreProcessor = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    
    if (subsystem.coreProcessor !== null) {
      return { success: false, error: 'coreProcessor should be null initially' };
    }
    
    return { success: true, message: 'Sets coreProcessor to null initially' };
  };

  const testConstructorSetsIsBuilt = async () => {
    const ms = createMockMessageSystem();
    const subsystem = new BaseSubsystem('test', { ms });
    
    if (subsystem._isBuilt !== false) {
      return { success: false, error: '_isBuilt should be false initially' };
    }
    if (subsystem.isBuilt !== false) {
      return { success: false, error: 'isBuilt getter should return false' };
    }
    
    return { success: true, message: 'Sets _isBuilt to false initially' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>BaseSubsystem Constructor Tests</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => {
            testCases.forEach(t => {
              if (!results.has(t.name) && !runningTests.has(t.name)) {
                runTest(t.name);
              }
            });
          }}
          disabled={runningTests.size > 0}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Run All Tests
        </button>
        <button
          onClick={() => setResults(new Map())}
          style={{ padding: '8px 16px' }}
        >
          Clear Results
        </button>
      </div>

      {categories.map(category => (
        <div key={category} style={{ marginBottom: '30px' }}>
          <h3>{category}</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {testsByCategory[category].map(test => {
              const result = results.get(test.name);
              const isRunning = runningTests.has(test.name);
              const hasResult = results.has(test.name);
              
              return (
                <div
                  key={test.name}
                  style={{
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: isRunning ? '#fff3cd' : hasResult ? (result.success ? '#d4edda' : '#f8d7da') : '#f8f9fa',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedTest(selectedTest === test.name ? null : test.name)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{test.name}</span>
                    <div>
                      {isRunning && <span style={{ color: '#856404' }}>Running...</span>}
                      {hasResult && !isRunning && (
                        <span style={{ color: result.success ? '#155724' : '#721c24', fontWeight: 'bold' }}>
                          {result.success ? '✓' : '✗'}
                        </span>
                      )}
                      {!hasResult && !isRunning && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runTest(test.name);
                          }}
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          Run
                        </button>
                      )}
                    </div>
                  </div>
                  {selectedTest === test.name && result && (
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '4px' }}>
                      {result.message && <div><strong>Message:</strong> {result.message}</div>}
                      {result.error && <div style={{ color: '#721c24' }}><strong>Error:</strong> {result.error}</div>}
                      {result.data && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>Data:</strong>
                          <pre style={{ backgroundColor: '#f8f9fa', padding: '10px', overflow: 'auto' }}>
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}







