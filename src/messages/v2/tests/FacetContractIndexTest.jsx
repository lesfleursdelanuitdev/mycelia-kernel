import { useState } from 'react';
import {
  defaultContractRegistry,
  FacetContractRegistry,
  FacetContract,
  createFacetContract,
  routerContract,
  queueContract,
  processorContract,
  listenersContract,
  hierarchyContract,
  schedulerContract
} from '../models/facet-contract/index.js';

/**
 * FacetContractIndexTest - React component test suite for default contract registry and exports
 */
export function FacetContractIndexTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const testCases = [
    // Default Registry Tests
    { name: 'defaultContractRegistry - is FacetContractRegistry instance', category: 'Default Registry' },
    { name: 'defaultContractRegistry - has all standard contracts registered', category: 'Default Registry' },
    { name: 'defaultContractRegistry - has router contract', category: 'Default Registry' },
    { name: 'defaultContractRegistry - has queue contract', category: 'Default Registry' },
    { name: 'defaultContractRegistry - has processor contract', category: 'Default Registry' },
    { name: 'defaultContractRegistry - has listeners contract', category: 'Default Registry' },
    { name: 'defaultContractRegistry - has hierarchy contract', category: 'Default Registry' },
    { name: 'defaultContractRegistry - has scheduler contract', category: 'Default Registry' },
    { name: 'defaultContractRegistry - size returns 6', category: 'Default Registry' },
    { name: 'defaultContractRegistry - list returns all contract names', category: 'Default Registry' },
    
    // Export Tests
    { name: 'Exports - FacetContractRegistry is exported', category: 'Exports' },
    { name: 'Exports - FacetContract is exported', category: 'Exports' },
    { name: 'Exports - createFacetContract is exported', category: 'Exports' },
    { name: 'Exports - routerContract is exported', category: 'Exports' },
    { name: 'Exports - queueContract is exported', category: 'Exports' },
    { name: 'Exports - processorContract is exported', category: 'Exports' },
    { name: 'Exports - listenersContract is exported', category: 'Exports' },
    { name: 'Exports - hierarchyContract is exported', category: 'Exports' },
    { name: 'Exports - schedulerContract is exported', category: 'Exports' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        // Default registry tests
        if (testName === 'defaultContractRegistry - is FacetContractRegistry instance') result = testDefaultRegistryIsInstance();
        else if (testName === 'defaultContractRegistry - has all standard contracts registered') result = testDefaultRegistryHasAllContracts();
        else if (testName === 'defaultContractRegistry - has router contract') result = testDefaultRegistryHasRouter();
        else if (testName === 'defaultContractRegistry - has queue contract') result = testDefaultRegistryHasQueue();
        else if (testName === 'defaultContractRegistry - has processor contract') result = testDefaultRegistryHasProcessor();
        else if (testName === 'defaultContractRegistry - has listeners contract') result = testDefaultRegistryHasListeners();
        else if (testName === 'defaultContractRegistry - has hierarchy contract') result = testDefaultRegistryHasHierarchy();
        else if (testName === 'defaultContractRegistry - has scheduler contract') result = testDefaultRegistryHasScheduler();
        else if (testName === 'defaultContractRegistry - size returns 6') result = testDefaultRegistrySize();
        else if (testName === 'defaultContractRegistry - list returns all contract names') result = testDefaultRegistryList();
        
        // Export tests
        else if (testName === 'Exports - FacetContractRegistry is exported') result = testExportsFacetContractRegistry();
        else if (testName === 'Exports - FacetContract is exported') result = testExportsFacetContract();
        else if (testName === 'Exports - createFacetContract is exported') result = testExportsCreateFacetContract();
        else if (testName === 'Exports - routerContract is exported') result = testExportsRouterContract();
        else if (testName === 'Exports - queueContract is exported') result = testExportsQueueContract();
        else if (testName === 'Exports - processorContract is exported') result = testExportsProcessorContract();
        else if (testName === 'Exports - listenersContract is exported') result = testExportsListenersContract();
        else if (testName === 'Exports - hierarchyContract is exported') result = testExportsHierarchyContract();
        else if (testName === 'Exports - schedulerContract is exported') result = testExportsSchedulerContract();
        
        else result = { success: false, error: 'Test not implemented' };

        setResults(prev => new Map(prev).set(testName, result));
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testName);
          return next;
        });
      } catch (error) {
        setResults(prev => new Map(prev).set(testName, {
          success: false,
          error: error.message || String(error)
        }));
        setRunningTests(prev => {
          const next = new Set(prev);
          next.delete(testName);
          return next;
        });
      }
    }, 10);
  };

  // ========== Default Registry Tests ==========

  const testDefaultRegistryIsInstance = () => {
    if (!(defaultContractRegistry instanceof FacetContractRegistry)) {
      return { success: false, error: 'defaultContractRegistry should be a FacetContractRegistry instance' };
    }
    return { success: true, message: 'Is FacetContractRegistry instance' };
  };

  const testDefaultRegistryHasAllContracts = () => {
    const expectedContracts = ['router', 'queue', 'processor', 'listeners', 'hierarchy', 'scheduler'];
    for (const contractName of expectedContracts) {
      if (!defaultContractRegistry.has(contractName)) {
        return { success: false, error: `Missing contract: ${contractName}` };
      }
    }
    return { success: true, message: 'Has all standard contracts registered' };
  };

  const testDefaultRegistryHasRouter = () => {
    if (!defaultContractRegistry.has('router')) {
      return { success: false, error: 'Should have router contract' };
    }
    const contract = defaultContractRegistry.get('router');
    if (contract !== routerContract) {
      return { success: false, error: 'Router contract should match exported routerContract' };
    }
    return { success: true, message: 'Has router contract' };
  };

  const testDefaultRegistryHasQueue = () => {
    if (!defaultContractRegistry.has('queue')) {
      return { success: false, error: 'Should have queue contract' };
    }
    const contract = defaultContractRegistry.get('queue');
    if (contract !== queueContract) {
      return { success: false, error: 'Queue contract should match exported queueContract' };
    }
    return { success: true, message: 'Has queue contract' };
  };

  const testDefaultRegistryHasProcessor = () => {
    if (!defaultContractRegistry.has('processor')) {
      return { success: false, error: 'Should have processor contract' };
    }
    const contract = defaultContractRegistry.get('processor');
    if (contract !== processorContract) {
      return { success: false, error: 'Processor contract should match exported processorContract' };
    }
    return { success: true, message: 'Has processor contract' };
  };

  const testDefaultRegistryHasListeners = () => {
    if (!defaultContractRegistry.has('listeners')) {
      return { success: false, error: 'Should have listeners contract' };
    }
    const contract = defaultContractRegistry.get('listeners');
    if (contract !== listenersContract) {
      return { success: false, error: 'Listeners contract should match exported listenersContract' };
    }
    return { success: true, message: 'Has listeners contract' };
  };

  const testDefaultRegistryHasHierarchy = () => {
    if (!defaultContractRegistry.has('hierarchy')) {
      return { success: false, error: 'Should have hierarchy contract' };
    }
    const contract = defaultContractRegistry.get('hierarchy');
    if (contract !== hierarchyContract) {
      return { success: false, error: 'Hierarchy contract should match exported hierarchyContract' };
    }
    return { success: true, message: 'Has hierarchy contract' };
  };

  const testDefaultRegistryHasScheduler = () => {
    if (!defaultContractRegistry.has('scheduler')) {
      return { success: false, error: 'Should have scheduler contract' };
    }
    const contract = defaultContractRegistry.get('scheduler');
    if (contract !== schedulerContract) {
      return { success: false, error: 'Scheduler contract should match exported schedulerContract' };
    }
    return { success: true, message: 'Has scheduler contract' };
  };

  const testDefaultRegistrySize = () => {
    const size = defaultContractRegistry.size();
    if (size !== 6) {
      return { success: false, error: `Size should be 6, got ${size}` };
    }
    return { success: true, message: 'Size returns 6' };
  };

  const testDefaultRegistryList = () => {
    const list = defaultContractRegistry.list();
    const expectedContracts = ['router', 'queue', 'processor', 'listeners', 'hierarchy', 'scheduler'];
    if (list.length !== 6) {
      return { success: false, error: `List should have 6 items, got ${list.length}` };
    }
    for (const contractName of expectedContracts) {
      if (!list.includes(contractName)) {
        return { success: false, error: `List should include ${contractName}` };
      }
    }
    return { success: true, message: 'List returns all contract names' };
  };

  // ========== Export Tests ==========

  const testExportsFacetContractRegistry = () => {
    if (typeof FacetContractRegistry !== 'function') {
      return { success: false, error: 'FacetContractRegistry should be exported as a class' };
    }
    return { success: true, message: 'FacetContractRegistry is exported' };
  };

  const testExportsFacetContract = () => {
    if (typeof FacetContract !== 'function') {
      return { success: false, error: 'FacetContract should be exported as a class' };
    }
    return { success: true, message: 'FacetContract is exported' };
  };

  const testExportsCreateFacetContract = () => {
    if (typeof createFacetContract !== 'function') {
      return { success: false, error: 'createFacetContract should be exported as a function' };
    }
    return { success: true, message: 'createFacetContract is exported' };
  };

  const testExportsRouterContract = () => {
    if (!routerContract || routerContract.name !== 'router') {
      return { success: false, error: 'routerContract should be exported' };
    }
    return { success: true, message: 'routerContract is exported' };
  };

  const testExportsQueueContract = () => {
    if (!queueContract || queueContract.name !== 'queue') {
      return { success: false, error: 'queueContract should be exported' };
    }
    return { success: true, message: 'queueContract is exported' };
  };

  const testExportsProcessorContract = () => {
    if (!processorContract || processorContract.name !== 'processor') {
      return { success: false, error: 'processorContract should be exported' };
    }
    return { success: true, message: 'processorContract is exported' };
  };

  const testExportsListenersContract = () => {
    if (!listenersContract || listenersContract.name !== 'listeners') {
      return { success: false, error: 'listenersContract should be exported' };
    }
    return { success: true, message: 'listenersContract is exported' };
  };

  const testExportsHierarchyContract = () => {
    if (!hierarchyContract || hierarchyContract.name !== 'hierarchy') {
      return { success: false, error: 'hierarchyContract should be exported' };
    }
    return { success: true, message: 'hierarchyContract is exported' };
  };

  const testExportsSchedulerContract = () => {
    if (!schedulerContract || schedulerContract.name !== 'scheduler') {
      return { success: false, error: 'schedulerContract should be exported' };
    }
    return { success: true, message: 'schedulerContract is exported' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Facet Contract Index Tests</h2>
      
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







