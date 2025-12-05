import { useState } from 'react';
import { useHierarchy } from '../hooks/hierarchy/use-hierarchy.mycelia.js';
import { ChildSubsystemRegistry } from '../hooks/hierarchy/child-subsystem-registry.mycelia.js';

/**
 * UseHierarchyTest - React component test suite for useHierarchy hook
 * Tests the useHierarchy hook directly without building subsystems
 */
export function UseHierarchyTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a hierarchy facet with fresh mocks
  const createHierarchyFacet = () => {
    const subsystem = { name: 'test-parent', _parent: null };
    const api = { name: 'test-parent' };
    const ctx = { config: {} };
    return useHierarchy(ctx, api, subsystem);
  };

  // Helper to create a child subsystem mock
  const createChild = (name) => ({ name, _parent: null });

  const testCases = [
    { name: 'Hook returns Facet', category: 'Initialization' },
    { name: 'Registry lazy initialization', category: 'Initialization' },
    { name: 'addChild() - success', category: 'Child Management' },
    { name: 'addChild() - duplicate name error', category: 'Child Management' },
    { name: 'addChild() - invalid child error', category: 'Child Management' },
    { name: 'removeChild() - by name', category: 'Child Management' },
    { name: 'removeChild() - by reference', category: 'Child Management' },
    { name: 'removeChild() - not found', category: 'Child Management' },
    { name: 'getChild() - found', category: 'Child Management' },
    { name: 'getChild() - not found', category: 'Child Management' },
    { name: 'listChildren() - empty', category: 'Child Management' },
    { name: 'listChildren() - with children', category: 'Child Management' },
    { name: 'setParent() - success', category: 'Parent Management' },
    { name: 'setParent() - invalid parent error', category: 'Parent Management' },
    { name: 'getParent() - with parent', category: 'Parent Management' },
    { name: 'getParent() - root', category: 'Parent Management' },
    { name: 'isRoot() - true', category: 'Parent Management' },
    { name: 'isRoot() - false', category: 'Parent Management' },
    { name: 'getRoot() - single level', category: 'Parent Management' },
    { name: 'getRoot() - multi-level', category: 'Parent Management' },
    { name: 'getLineage() - current subsystem', category: 'Lineage' },
    { name: 'getLineage() - with node', category: 'Lineage' },
    { name: 'children getter', category: 'Registry Access' },
    { name: 'init() method', category: 'Lifecycle' },
    { name: 'dispose() method', category: 'Lifecycle' },
    { name: 'Multiple children management', category: 'Integration' },
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
          case 'Registry lazy initialization':
            result = testRegistryLazyInit();
            break;
          case 'addChild() - success':
            result = testAddChildSuccess();
            break;
          case 'addChild() - duplicate name error':
            result = testAddChildDuplicate();
            break;
          case 'addChild() - invalid child error':
            result = testAddChildInvalid();
            break;
          case 'removeChild() - by name':
            result = testRemoveChildByName();
            break;
          case 'removeChild() - by reference':
            result = testRemoveChildByRef();
            break;
          case 'removeChild() - not found':
            result = testRemoveChildNotFound();
            break;
          case 'getChild() - found':
            result = testGetChildFound();
            break;
          case 'getChild() - not found':
            result = testGetChildNotFound();
            break;
          case 'listChildren() - empty':
            result = testListChildrenEmpty();
            break;
          case 'listChildren() - with children':
            result = testListChildrenWithChildren();
            break;
          case 'setParent() - success':
            result = testSetParentSuccess();
            break;
          case 'setParent() - invalid parent error':
            result = testSetParentInvalid();
            break;
          case 'getParent() - with parent':
            result = testGetParentWithParent();
            break;
          case 'getParent() - root':
            result = testGetParentRoot();
            break;
          case 'isRoot() - true':
            result = testIsRootTrue();
            break;
          case 'isRoot() - false':
            result = testIsRootFalse();
            break;
          case 'getRoot() - single level':
            result = testGetRootSingleLevel();
            break;
          case 'getRoot() - multi-level':
            result = testGetRootMultiLevel();
            break;
          case 'getLineage() - current subsystem':
            result = testGetLineageCurrent();
            break;
          case 'getLineage() - with node':
            result = testGetLineageWithNode();
            break;
          case 'children getter':
            result = testChildrenGetter();
            break;
          case 'init() method':
            result = testInit();
            break;
          case 'dispose() method':
            result = testDispose();
            break;
          case 'Multiple children management':
            result = testMultipleChildren();
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
    const facet = createHierarchyFacet();
    
    if (!facet || typeof facet !== 'object') {
      return { success: false, error: 'Hook should return an object' };
    }
    if (facet.getKind() !== 'hierarchy') {
      return { success: false, error: `Facet kind should be 'hierarchy', got '${facet.getKind()}'` };
    }
    
    return {
      success: true,
      message: 'Hook returns a Facet with correct kind',
      data: { kind: facet.getKind() }
    };
  };

  const testRegistryLazyInit = () => {
    const facet = createHierarchyFacet();
    
    // Registry should not be created until accessed
    // We can't directly check if registry is null, but we can verify
    // that accessing children creates it
    const children1 = facet.children;
    const children2 = facet.children;
    
    if (!(children1 instanceof ChildSubsystemRegistry)) {
      return { success: false, error: 'children getter should return ChildSubsystemRegistry' };
    }
    if (children1 !== children2) {
      return { success: false, error: 'children getter should return same instance' };
    }
    
    return {
      success: true,
      message: 'Registry is lazily initialized and cached',
      data: { registryType: children1.constructor.name }
    };
  };

  const testAddChildSuccess = () => {
    const facet = createHierarchyFacet();
    const child = createChild('child1');
    
    const added = facet.addChild(child);
    
    if (added !== child) {
      return { success: false, error: 'addChild should return the added child' };
    }
    if (facet.listChildren().length !== 1) {
      return { success: false, error: 'Child not added to registry' };
    }
    if (facet.getChild('child1') !== child) {
      return { success: false, error: 'Child not retrievable by name' };
    }
    
    return {
      success: true,
      message: 'addChild successfully adds child to registry',
      data: { childrenCount: facet.listChildren().length }
    };
  };

  const testAddChildDuplicate = () => {
    const facet = createHierarchyFacet();
    const child1 = createChild('child1');
    const child2 = createChild('child1'); // Same name
    
    facet.addChild(child1);
    
    try {
      facet.addChild(child2);
      return { success: false, error: 'addChild should throw error for duplicate name' };
    } catch (error) {
      if (!error.message.includes('already exists')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'addChild throws error for duplicate names',
      data: {}
    };
  };

  const testAddChildInvalid = () => {
    const facet = createHierarchyFacet();
    
    // Test invalid child - no name
    try {
      facet.addChild({});
      return { success: false, error: 'addChild should throw error for child without name' };
    } catch (error) {
      if (!error.message.includes('name')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    // Test invalid child - not an object
    try {
      facet.addChild('not-an-object');
      return { success: false, error: 'addChild should throw error for non-object' };
    } catch (error) {
      // Should throw from registry
    }
    
    return {
      success: true,
      message: 'addChild validates child input correctly',
      data: {}
    };
  };

  const testRemoveChildByName = () => {
    const facet = createHierarchyFacet();
    const child = createChild('child1');
    
    facet.addChild(child);
    const removed = facet.removeChild('child1');
    
    if (!removed) {
      return { success: false, error: 'removeChild should return true when child exists' };
    }
    if (facet.listChildren().length !== 0) {
      return { success: false, error: 'Child not removed from registry' };
    }
    if (facet.getChild('child1') !== undefined) {
      return { success: false, error: 'Child still retrievable after removal' };
    }
    
    return {
      success: true,
      message: 'removeChild by name works correctly',
      data: { childrenCount: facet.listChildren().length }
    };
  };

  const testRemoveChildByRef = () => {
    const facet = createHierarchyFacet();
    const child = createChild('child1');
    
    facet.addChild(child);
    const removed = facet.removeChild(child);
    
    if (!removed) {
      return { success: false, error: 'removeChild should return true when child exists' };
    }
    if (facet.listChildren().length !== 0) {
      return { success: false, error: 'Child not removed from registry' };
    }
    
    return {
      success: true,
      message: 'removeChild by reference works correctly',
      data: { childrenCount: facet.listChildren().length }
    };
  };

  const testRemoveChildNotFound = () => {
    const facet = createHierarchyFacet();
    
    const removed = facet.removeChild('nonexistent');
    
    if (removed !== false) {
      return { success: false, error: 'removeChild should return false when child not found' };
    }
    
    return {
      success: true,
      message: 'removeChild returns false for non-existent child',
      data: {}
    };
  };

  const testGetChildFound = () => {
    const facet = createHierarchyFacet();
    const child = createChild('child1');
    
    facet.addChild(child);
    const retrieved = facet.getChild('child1');
    
    if (retrieved !== child) {
      return { success: false, error: 'getChild should return the correct child' };
    }
    
    return {
      success: true,
      message: 'getChild retrieves child by name correctly',
      data: { childName: retrieved.name }
    };
  };

  const testGetChildNotFound = () => {
    const facet = createHierarchyFacet();
    
    const retrieved = facet.getChild('nonexistent');
    
    if (retrieved !== undefined) {
      return { success: false, error: 'getChild should return undefined for non-existent child' };
    }
    
    return {
      success: true,
      message: 'getChild returns undefined for non-existent child',
      data: {}
    };
  };

  const testListChildrenEmpty = () => {
    const facet = createHierarchyFacet();
    const children = facet.listChildren();
    
    if (!Array.isArray(children)) {
      return { success: false, error: 'listChildren should return an array' };
    }
    if (children.length !== 0) {
      return { success: false, error: 'listChildren should return empty array when no children' };
    }
    
    return {
      success: true,
      message: 'listChildren returns empty array when no children',
      data: { childrenCount: children.length }
    };
  };

  const testListChildrenWithChildren = () => {
    const facet = createHierarchyFacet();
    const child1 = createChild('child1');
    const child2 = createChild('child2');
    
    facet.addChild(child1);
    facet.addChild(child2);
    const children = facet.listChildren();
    
    if (children.length !== 2) {
      return { success: false, error: `Expected 2 children, got ${children.length}` };
    }
    if (!children.includes(child1) || !children.includes(child2)) {
      return { success: false, error: 'listChildren should include all added children' };
    }
    
    // Test that it returns a copy
    const children2 = facet.listChildren();
    if (children === children2) {
      return { success: false, error: 'listChildren should return a new array each time' };
    }
    
    return {
      success: true,
      message: 'listChildren returns all children as independent array',
      data: { childrenCount: children.length, childNames: children.map(c => c.name) }
    };
  };

  const testSetParentSuccess = () => {
    const subsystem = { name: 'test-parent', _parent: null };
    const api = { name: 'test-parent' };
    const ctx = { config: {} };
    const facet = useHierarchy(ctx, api, subsystem);
    const parent = { name: 'parent', _parent: null };
    
    const result = facet.setParent(parent);
    
    if (result !== subsystem) {
      return { success: false, error: 'setParent should return subsystem for chaining' };
    }
    if (facet.getParent() !== parent) {
      return { success: false, error: 'Parent not set correctly' };
    }
    
    // Test setting to null
    facet.setParent(null);
    if (facet.getParent() !== null) {
      return { success: false, error: 'setParent should allow setting to null' };
    }
    
    return {
      success: true,
      message: 'setParent sets parent correctly and supports chaining',
      data: {}
    };
  };

  const testSetParentInvalid = () => {
    const facet = createHierarchyFacet();
    
    try {
      facet.setParent('not-an-object');
      return { success: false, error: 'setParent should throw error for invalid parent' };
    } catch (error) {
      if (!error.message.includes('parent must be an object')) {
        return { success: false, error: `Wrong error message: ${error.message}` };
      }
    }
    
    return {
      success: true,
      message: 'setParent validates parent input correctly',
      data: {}
    };
  };

  const testGetParentWithParent = () => {
    const facet = createHierarchyFacet();
    const parent = { name: 'parent', _parent: null };
    
    facet.setParent(parent);
    const retrieved = facet.getParent();
    
    if (retrieved !== parent) {
      return { success: false, error: 'getParent should return the set parent' };
    }
    
    return {
      success: true,
      message: 'getParent returns parent when set',
      data: { parentName: retrieved.name }
    };
  };

  const testGetParentRoot = () => {
    const facet = createHierarchyFacet();
    
    const parent = facet.getParent();
    
    if (parent !== null) {
      return { success: false, error: 'getParent should return null for root subsystem' };
    }
    
    return {
      success: true,
      message: 'getParent returns null for root subsystem',
      data: {}
    };
  };

  const testIsRootTrue = () => {
    const facet = createHierarchyFacet();
    
    const isRoot = facet.isRoot();
    
    if (isRoot !== true) {
      return { success: false, error: 'isRoot should return true when no parent' };
    }
    
    return {
      success: true,
      message: 'isRoot returns true for root subsystem',
      data: {}
    };
  };

  const testIsRootFalse = () => {
    const facet = createHierarchyFacet();
    const parent = { name: 'parent', _parent: null };
    
    facet.setParent(parent);
    const isRoot = facet.isRoot();
    
    if (isRoot !== false) {
      return { success: false, error: 'isRoot should return false when parent exists' };
    }
    
    return {
      success: true,
      message: 'isRoot returns false when parent exists',
      data: {}
    };
  };

  const testGetRootSingleLevel = () => {
    const subsystem = { name: 'test-parent', _parent: null };
    const api = { name: 'test-parent' };
    const ctx = { config: {} };
    const facet = useHierarchy(ctx, api, subsystem);
    
    const root = facet.getRoot();
    
    if (root !== subsystem) {
      return { success: false, error: 'getRoot should return self when already root' };
    }
    
    return {
      success: true,
      message: 'getRoot returns self when already root',
      data: {}
    };
  };

  const testGetRootMultiLevel = () => {
    const root = { name: 'root', _parent: null };
    const middle = { name: 'middle', _parent: root };
    const leaf = { name: 'leaf', _parent: middle };
    
    const api = { name: 'leaf' };
    const ctx = { config: {} };
    const facet = useHierarchy(ctx, api, leaf);
    
    const retrievedRoot = facet.getRoot();
    
    if (retrievedRoot !== root) {
      return { success: false, error: 'getRoot should traverse to root' };
    }
    
    return {
      success: true,
      message: 'getRoot traverses multi-level hierarchy correctly',
      data: { rootName: retrievedRoot.name }
    };
  };

  const testGetLineageCurrent = () => {
    const subsystem = { name: 'test-parent', _parent: null };
    const api = { name: 'test-parent' };
    const ctx = { config: {} };
    const facet = useHierarchy(ctx, api, subsystem);
    
    const lineage = facet.getLineage();
    
    if (!Array.isArray(lineage)) {
      return { success: false, error: 'getLineage should return an array' };
    }
    if (lineage.length !== 1 || lineage[0] !== subsystem) {
      return { success: false, error: 'getLineage should include current subsystem' };
    }
    
    return {
      success: true,
      message: 'getLineage returns lineage for current subsystem',
      data: { lineageLength: lineage.length, names: lineage.map(n => n.name) }
    };
  };

  const testGetLineageWithNode = () => {
    const root = { name: 'root', _parent: null };
    const middle = { name: 'middle', _parent: root };
    const leaf = { name: 'leaf', _parent: middle };
    
    const api = { name: 'root' };
    const ctx = { config: {} };
    const facet = useHierarchy(ctx, api, root);
    
    const lineage = facet.getLineage(leaf);
    
    if (lineage.length !== 3) {
      return { success: false, error: `Expected lineage length 3, got ${lineage.length}` };
    }
    if (lineage[0] !== root || lineage[1] !== middle || lineage[2] !== leaf) {
      return { success: false, error: 'Lineage should be ordered root → node' };
    }
    
    return {
      success: true,
      message: 'getLineage returns correct lineage for specified node',
      data: { lineageLength: lineage.length, names: lineage.map(n => n.name) }
    };
  };

  const testChildrenGetter = () => {
    const facet = createHierarchyFacet();
    
    const children1 = facet.children;
    const children2 = facet.children;
    
    if (!(children1 instanceof ChildSubsystemRegistry)) {
      return { success: false, error: 'children getter should return ChildSubsystemRegistry' };
    }
    if (children1 !== children2) {
      return { success: false, error: 'children getter should return same instance' };
    }
    
    // Test registry methods work
    const child = createChild('child1');
    children1.add(child);
    if (facet.listChildren().length !== 1) {
      return { success: false, error: 'Registry methods should work through children getter' };
    }
    
    return {
      success: true,
      message: 'children getter returns ChildSubsystemRegistry instance',
      data: { registryType: children1.constructor.name }
    };
  };

  const testInit = () => {
    const facet = createHierarchyFacet();
    
    // init() should be safe to call
    facet.init();
    
    // Should be able to call multiple times
    facet.init();
    
    // Registry should be accessible after init
    const children = facet.children;
    if (!(children instanceof ChildSubsystemRegistry)) {
      return { success: false, error: 'Registry should be accessible after init' };
    }
    
    return {
      success: true,
      message: 'init() method works correctly',
      data: {}
    };
  };

  const testDispose = () => {
    const facet = createHierarchyFacet();
    
    // Add a child first
    const child = createChild('child1');
    facet.addChild(child);
    
    if (facet.listChildren().length !== 1) {
      return { success: false, error: 'Child should be added before dispose test' };
    }
    
    // Dispose
    facet.dispose();
    
    // Registry should be cleared (children list should be empty)
    if (facet.listChildren().length !== 0) {
      return { success: false, error: 'Registry should be cleared after dispose' };
    }
    
    // Should be safe to call multiple times
    facet.dispose();
    
    return {
      success: true,
      message: 'dispose() clears registry correctly',
      data: { childrenCountAfterDispose: facet.listChildren().length }
    };
  };

  const testMultipleChildren = () => {
    const facet = createHierarchyFacet();
    const child1 = createChild('child1');
    const child2 = createChild('child2');
    const child3 = createChild('child3');
    
    facet.addChild(child1);
    facet.addChild(child2);
    facet.addChild(child3);
    
    if (facet.listChildren().length !== 3) {
      return { success: false, error: `Expected 3 children, got ${facet.listChildren().length}` };
    }
    
    // Remove middle child
    facet.removeChild('child2');
    if (facet.listChildren().length !== 2) {
      return { success: false, error: 'Child not removed correctly' };
    }
    if (facet.getChild('child2') !== undefined) {
      return { success: false, error: 'Removed child still retrievable' };
    }
    
    // Verify remaining children
    if (facet.getChild('child1') !== child1 || facet.getChild('child3') !== child3) {
      return { success: false, error: 'Remaining children not correct' };
    }
    
    return {
      success: true,
      message: 'Multiple children management works correctly',
      data: { 
        initialCount: 3,
        afterRemove: facet.listChildren().length,
        remaining: facet.listChildren().map(c => c.name)
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
          useHierarchy Tests
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

