import { useState } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { FACET_KINDS } from '../models/defaults/default-hooks.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';

/**
 * BaseSubsystemHierarchyTest
 * Tests for BaseSubsystem hierarchy management methods
 */
export function BaseSubsystemHierarchyTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  const createMockMessageSystem = () => ({ name: 'mock-ms', id: 'ms-1' });

  const testCases = [
    { name: 'setParent - assigns parent subsystem', category: 'Hierarchy' },
    { name: 'setParent - delegates to hierarchy facet if present', category: 'Hierarchy' },
    { name: 'setParent - uses fallback if hierarchy facet not present', category: 'Hierarchy' },
    { name: 'setParent - throws error for invalid parent type', category: 'Hierarchy' },
    { name: 'setParent - supports method chaining', category: 'Hierarchy' },
    { name: 'getParent - returns parent subsystem', category: 'Hierarchy' },
    { name: 'getParent - delegates to hierarchy facet if present', category: 'Hierarchy' },
    { name: 'getParent - uses fallback if hierarchy facet not present', category: 'Hierarchy' },
    { name: 'getParent - returns null for root subsystem', category: 'Hierarchy' },
    { name: 'isRoot - returns true for root subsystem', category: 'Hierarchy' },
    { name: 'isRoot - returns false for child subsystem', category: 'Hierarchy' },
    { name: 'isRoot - delegates to hierarchy facet if present', category: 'Hierarchy' },
    { name: 'isRoot - uses fallback if hierarchy facet not present', category: 'Hierarchy' },
    { name: 'getRoot - returns root subsystem', category: 'Hierarchy' },
    { name: 'getRoot - traverses parent chain correctly', category: 'Hierarchy' },
    { name: 'getRoot - delegates to hierarchy facet if present', category: 'Hierarchy' },
    { name: 'getRoot - uses fallback if hierarchy facet not present', category: 'Hierarchy' },
    { name: 'getNameString - returns correct format for root subsystem', category: 'Hierarchy' },
    { name: 'getNameString - returns correct format for child subsystem', category: 'Hierarchy' },
    { name: 'getNameString - returns correct format for nested children', category: 'Hierarchy' },
    { name: 'getNameString - handles trailing slashes correctly', category: 'Hierarchy' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) return;
    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        switch (testName) {
          case 'setParent - assigns parent subsystem':
            result = await testSetParentAssigns();
            break;
          case 'setParent - delegates to hierarchy facet if present':
            result = await testSetParentDelegates();
            break;
          case 'setParent - uses fallback if hierarchy facet not present':
            result = await testSetParentFallback();
            break;
          case 'setParent - throws error for invalid parent type':
            result = await testSetParentThrows();
            break;
          case 'setParent - supports method chaining':
            result = await testSetParentChaining();
            break;
          case 'getParent - returns parent subsystem':
            result = await testGetParentReturns();
            break;
          case 'getParent - delegates to hierarchy facet if present':
            result = await testGetParentDelegates();
            break;
          case 'getParent - uses fallback if hierarchy facet not present':
            result = await testGetParentFallback();
            break;
          case 'getParent - returns null for root subsystem':
            result = await testGetParentNull();
            break;
          case 'isRoot - returns true for root subsystem':
            result = await testIsRootTrue();
            break;
          case 'isRoot - returns false for child subsystem':
            result = await testIsRootFalse();
            break;
          case 'isRoot - delegates to hierarchy facet if present':
            result = await testIsRootDelegates();
            break;
          case 'isRoot - uses fallback if hierarchy facet not present':
            result = await testIsRootFallback();
            break;
          case 'getRoot - returns root subsystem':
            result = await testGetRootReturns();
            break;
          case 'getRoot - traverses parent chain correctly':
            result = await testGetRootTraverses();
            break;
          case 'getRoot - delegates to hierarchy facet if present':
            result = await testGetRootDelegates();
            break;
          case 'getRoot - uses fallback if hierarchy facet not present':
            result = await testGetRootFallback();
            break;
          case 'getNameString - returns correct format for root subsystem':
            result = await testGetNameStringRoot();
            break;
          case 'getNameString - returns correct format for child subsystem':
            result = await testGetNameStringChild();
            break;
          case 'getNameString - returns correct format for nested children':
            result = await testGetNameStringNested();
            break;
          case 'getNameString - handles trailing slashes correctly':
            result = await testGetNameStringTrailing();
            break;
          default:
            result = { success: false, error: 'Unknown test case' };
        }

        setResults(prev => new Map(prev).set(testName, {
          name: testName,
          success: result.success,
          error: result.error,
          message: result.message
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

  const testSetParentAssigns = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    if (child._parent !== parent) {
      return { success: false, error: 'Parent should be assigned' };
    }
    return { success: true, message: 'Assigns parent subsystem' };
  };

  const testSetParentDelegates = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    let delegated = false;
    const hierarchyFacet = new Facet(FACET_KINDS.HIERARCHY, { attach: false });
    hierarchyFacet.setParent = (p) => { delegated = true; return hierarchyFacet; };
    child.api.__facets.add(FACET_KINDS.HIERARCHY, hierarchyFacet);
    child.setParent(parent);
    if (!delegated) {
      return { success: false, error: 'Should delegate to hierarchy facet' };
    }
    return { success: true, message: 'Delegates to hierarchy facet' };
  };

  const testSetParentFallback = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    if (child._parent !== parent) {
      return { success: false, error: 'Should use fallback' };
    }
    return { success: true, message: 'Uses fallback when no hierarchy facet' };
  };

  const testSetParentThrows = async () => {
    const ms = createMockMessageSystem();
    const child = new BaseSubsystem('child', { ms });
    try {
      child.setParent('invalid');
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('parent must be an object')) {
        return { success: true, message: 'Throws error for invalid parent' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testSetParentChaining = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    const result = child.setParent(parent);
    if (result !== child) {
      return { success: false, error: 'Should return this for chaining' };
    }
    return { success: true, message: 'Supports method chaining' };
  };

  const testGetParentReturns = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    if (child.getParent() !== parent) {
      return { success: false, error: 'Should return parent' };
    }
    return { success: true, message: 'Returns parent subsystem' };
  };

  const testGetParentDelegates = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    const hierarchyFacet = new Facet(FACET_KINDS.HIERARCHY, { attach: false });
    hierarchyFacet.getParent = () => parent;
    child.api.__facets.add(FACET_KINDS.HIERARCHY, hierarchyFacet);
    if (child.getParent() !== parent) {
      return { success: false, error: 'Should delegate to hierarchy facet' };
    }
    return { success: true, message: 'Delegates to hierarchy facet' };
  };

  const testGetParentFallback = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    if (child.getParent() !== parent) {
      return { success: false, error: 'Should use fallback' };
    }
    return { success: true, message: 'Uses fallback when no hierarchy facet' };
  };

  const testGetParentNull = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    if (root.getParent() !== null) {
      return { success: false, error: 'Should return null for root' };
    }
    return { success: true, message: 'Returns null for root subsystem' };
  };

  const testIsRootTrue = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    if (!root.isRoot()) {
      return { success: false, error: 'Should return true for root' };
    }
    return { success: true, message: 'Returns true for root subsystem' };
  };

  const testIsRootFalse = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    if (child.isRoot()) {
      return { success: false, error: 'Should return false for child' };
    }
    return { success: true, message: 'Returns false for child subsystem' };
  };

  const testIsRootDelegates = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    const hierarchyFacet = new Facet(FACET_KINDS.HIERARCHY, { attach: false });
    hierarchyFacet.isRoot = () => true;
    root.api.__facets.add(FACET_KINDS.HIERARCHY, hierarchyFacet);
    if (!root.isRoot()) {
      return { success: false, error: 'Should delegate to hierarchy facet' };
    }
    return { success: true, message: 'Delegates to hierarchy facet' };
  };

  const testIsRootFallback = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    if (!root.isRoot()) {
      return { success: false, error: 'Should use fallback' };
    }
    return { success: true, message: 'Uses fallback when no hierarchy facet' };
  };

  const testGetRootReturns = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    if (root.getRoot() !== root) {
      return { success: false, error: 'Should return root' };
    }
    return { success: true, message: 'Returns root subsystem' };
  };

  const testGetRootTraverses = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    const child = new BaseSubsystem('child', { ms });
    const grandchild = new BaseSubsystem('grandchild', { ms });
    child.setParent(root);
    grandchild.setParent(child);
    if (grandchild.getRoot() !== root) {
      return { success: false, error: 'Should traverse to root' };
    }
    return { success: true, message: 'Traverses parent chain correctly' };
  };

  const testGetRootDelegates = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    const hierarchyFacet = new Facet(FACET_KINDS.HIERARCHY, { attach: false });
    hierarchyFacet.getRoot = () => root;
    root.api.__facets.add(FACET_KINDS.HIERARCHY, hierarchyFacet);
    if (root.getRoot() !== root) {
      return { success: false, error: 'Should delegate to hierarchy facet' };
    }
    return { success: true, message: 'Delegates to hierarchy facet' };
  };

  const testGetRootFallback = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    if (root.getRoot() !== root) {
      return { success: false, error: 'Should use fallback' };
    }
    return { success: true, message: 'Uses fallback when no hierarchy facet' };
  };

  const testGetNameStringRoot = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    const nameStr = root.getNameString();
    if (nameStr !== 'root://') {
      return { success: false, error: `Expected 'root://', got '${nameStr}'` };
    }
    return { success: true, message: 'Returns correct format for root' };
  };

  const testGetNameStringChild = async () => {
    const ms = createMockMessageSystem();
    const parent = new BaseSubsystem('parent', { ms });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(parent);
    const nameStr = child.getNameString();
    if (nameStr !== 'parent://child') {
      return { success: false, error: `Expected 'parent://child', got '${nameStr}'` };
    }
    return { success: true, message: 'Returns correct format for child' };
  };

  const testGetNameStringNested = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    const child = new BaseSubsystem('child', { ms });
    const grandchild = new BaseSubsystem('grandchild', { ms });
    child.setParent(root);
    grandchild.setParent(child);
    const nameStr = grandchild.getNameString();
    if (nameStr !== 'root://child/grandchild') {
      return { success: false, error: `Expected 'root://child/grandchild', got '${nameStr}'` };
    }
    return { success: true, message: 'Returns correct format for nested children' };
  };

  const testGetNameStringTrailing = async () => {
    const ms = createMockMessageSystem();
    const root = new BaseSubsystem('root', { ms });
    const child = new BaseSubsystem('child', { ms });
    child.setParent(root);
    const nameStr = child.getNameString();
    // Check for accidental double slashes (not the protocol separator ://)
    // Remove :// pattern and check if any // remains
    const withoutProtocol = nameStr.replace(/:\/\//g, '');
    if (withoutProtocol.includes('//')) {
      return { success: false, error: `Should not have accidental double slashes: '${nameStr}'` };
    }
    // Also verify the format is correct (should be root://child)
    if (nameStr !== 'root://child') {
      return { success: false, error: `Expected 'root://child', got '${nameStr}'` };
    }
    return { success: true, message: 'Handles trailing slashes correctly' };
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>BaseSubsystem Hierarchy Tests</h2>
      
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

