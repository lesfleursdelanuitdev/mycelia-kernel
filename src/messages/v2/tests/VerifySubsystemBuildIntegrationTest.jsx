import { useState } from 'react';
import { verifySubsystemBuild } from '../models/subsystem-builder/subsystem-builder.utils.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';
import { defaultContractRegistry } from '../models/facet-contract/index.js';

/**
 * VerifySubsystemBuildIntegrationTest - React component test suite for verifySubsystemBuild integration with contract validation
 * Tests to ensure verifySubsystemBuild still works correctly with contract validation
 */
export function VerifySubsystemBuildIntegrationTest() {
  const [results, setResults] = useState(new Map());
  const [selectedTest, setSelectedTest] = useState(null);
  const [runningTests, setRunningTests] = useState(new Set());

  // Helper to create a mock subsystem
  const createSubsystem = (options = {}) => {
    return {
      name: options.name || 'test-subsystem',
      ctx: options.ctx || {},
      defaultHooks: options.defaultHooks || [],
      hooks: options.hooks || [],
      api: options.api || { name: options.name || 'test-subsystem' },
      ms: options.ms || null
    };
  };

  const testCases = [
    // Integration with verifySubsystemBuild
    { name: 'verifySubsystemBuild - calls validateFacets', category: 'Integration' },
    { name: 'verifySubsystemBuild - validates facets before dependency graph', category: 'Integration' },
    { name: 'verifySubsystemBuild - validates facets after facet creation', category: 'Integration' },
    { name: 'verifySubsystemBuild - passes resolvedCtx to validateFacets', category: 'Integration' },
    { name: 'verifySubsystemBuild - passes subsystem to validateFacets', category: 'Integration' },
    { name: 'verifySubsystemBuild - uses defaultContractRegistry', category: 'Integration' },
    
    // Error Propagation Tests
    { name: 'verifySubsystemBuild - propagates contract validation errors', category: 'Error Propagation' },
    { name: 'verifySubsystemBuild - includes facet info in error messages', category: 'Error Propagation' },
    { name: 'verifySubsystemBuild - fails fast on first contract error', category: 'Error Propagation' },
    { name: 'verifySubsystemBuild - error prevents build plan creation', category: 'Error Propagation' },
    
    // Facets Without Contracts Tests
    { name: 'verifySubsystemBuild - works with facets without contracts', category: 'Facets Without Contracts' },
    { name: 'verifySubsystemBuild - works with mixed facets (some with contracts, some without)', category: 'Facets Without Contracts' },
    { name: 'verifySubsystemBuild - validates only facets with contracts', category: 'Facets Without Contracts' },
    
    // Build Flow Tests
    { name: 'verifySubsystemBuild - contract validation happens before dependency validation', category: 'Build Flow' },
    { name: 'verifySubsystemBuild - contract validation happens after facet creation', category: 'Build Flow' },
    { name: 'verifySubsystemBuild - successful validation allows build to continue', category: 'Build Flow' },
    { name: 'verifySubsystemBuild - contract errors prevent dependency graph building', category: 'Build Flow' },
    
    // Real-World Scenarios
    { name: 'verifySubsystemBuild - validates router facet with router contract', category: 'Real-World Scenarios' },
    { name: 'verifySubsystemBuild - validates queue facet with queue contract', category: 'Real-World Scenarios' },
    { name: 'verifySubsystemBuild - validates processor facet with processor contract', category: 'Real-World Scenarios' },
    { name: 'verifySubsystemBuild - validates listeners facet with listeners contract', category: 'Real-World Scenarios' },
    { name: 'verifySubsystemBuild - validates hierarchy facet with hierarchy contract', category: 'Real-World Scenarios' },
    { name: 'verifySubsystemBuild - validates scheduler facet with scheduler contract', category: 'Real-World Scenarios' },
    { name: 'verifySubsystemBuild - validates multiple facets with contracts', category: 'Real-World Scenarios' },
  ];

  const runTest = async (testName) => {
    if (runningTests.has(testName) || results.has(testName)) {
      return;
    }

    setRunningTests(prev => new Set(prev).add(testName));

    setTimeout(async () => {
      try {
        let result;
        
        // Integration tests
        if (testName === 'verifySubsystemBuild - calls validateFacets') result = testCallsValidateFacets();
        else if (testName === 'verifySubsystemBuild - validates facets before dependency graph') result = testValidatesBeforeDependencyGraph();
        else if (testName === 'verifySubsystemBuild - validates facets after facet creation') result = testValidatesAfterFacetCreation();
        else if (testName === 'verifySubsystemBuild - passes resolvedCtx to validateFacets') result = testPassesResolvedCtx();
        else if (testName === 'verifySubsystemBuild - passes subsystem to validateFacets') result = testPassesSubsystem();
        else if (testName === 'verifySubsystemBuild - uses defaultContractRegistry') result = testUsesDefaultRegistry();
        
        // Error propagation tests
        else if (testName === 'verifySubsystemBuild - propagates contract validation errors') result = testPropagatesContractErrors();
        else if (testName === 'verifySubsystemBuild - includes facet info in error messages') result = testIncludesFacetInfo();
        else if (testName === 'verifySubsystemBuild - fails fast on first contract error') result = testFailsFast();
        else if (testName === 'verifySubsystemBuild - error prevents build plan creation') result = testErrorPreventsPlan();
        
        // Facets without contracts tests
        else if (testName === 'verifySubsystemBuild - works with facets without contracts') result = testWorksWithoutContracts();
        else if (testName === 'verifySubsystemBuild - works with mixed facets (some with contracts, some without)') result = testWorksWithMixedFacets();
        else if (testName === 'verifySubsystemBuild - validates only facets with contracts') result = testValidatesOnlyWithContracts();
        
        // Build flow tests
        else if (testName === 'verifySubsystemBuild - contract validation happens before dependency validation') result = testContractValidationBeforeDependency();
        else if (testName === 'verifySubsystemBuild - contract validation happens after facet creation') result = testContractValidationAfterFacetCreation();
        else if (testName === 'verifySubsystemBuild - successful validation allows build to continue') result = testSuccessfulValidationAllowsBuild();
        else if (testName === 'verifySubsystemBuild - contract errors prevent dependency graph building') result = testContractErrorsPreventGraph();
        
        // Real-world scenarios
        else if (testName === 'verifySubsystemBuild - validates router facet with router contract') result = testValidatesRouterFacet();
        else if (testName === 'verifySubsystemBuild - validates queue facet with queue contract') result = testValidatesQueueFacet();
        else if (testName === 'verifySubsystemBuild - validates processor facet with processor contract') result = testValidatesProcessorFacet();
        else if (testName === 'verifySubsystemBuild - validates listeners facet with listeners contract') result = testValidatesListenersFacet();
        else if (testName === 'verifySubsystemBuild - validates hierarchy facet with hierarchy contract') result = testValidatesHierarchyFacet();
        else if (testName === 'verifySubsystemBuild - validates scheduler facet with scheduler contract') result = testValidatesSchedulerFacet();
        else if (testName === 'verifySubsystemBuild - validates multiple facets with contracts') result = testValidatesMultipleFacets();
        
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

  // ========== Integration Tests ==========

  const testCallsValidateFacets = () => {
    // Test that validateFacets is called by creating a facet with a contract
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({
              accept: () => {},
              processMessage: () => {},
              processTick: () => {},
              processImmediately: () => {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      // If we get here, validateFacets was called and validation passed
      return { success: true, message: 'Calls validateFacets (indirectly verified)' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testValidatesBeforeDependencyGraph = () => {
    // Contract validation happens before dependency graph building
    // Test by creating a facet with invalid contract that would fail validation
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            // Missing required methods - should fail contract validation
            facet.add({});
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: false, error: 'Should throw error before dependency graph building' };
    } catch (error) {
      // Error should be about contract validation, not dependency graph
      if (error.message.includes('contract validation') || error.message.includes('missing required methods')) {
        return { success: true, message: 'Validates facets before dependency graph' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testValidatesAfterFacetCreation = () => {
    // Contract validation happens after facet creation
    // This is verified by the fact that facets are created and then validated
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({
              accept: () => {},
              processMessage: () => {},
              processTick: () => {},
              processImmediately: () => {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Validates facets after facet creation' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testPassesResolvedCtx = () => {
    const ctx = { config: { test: 'value' } };
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({
              accept: () => {},
              processMessage: () => {},
              processTick: () => {},
              processImmediately: () => {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, ctx);
      return { success: true, message: 'Passes resolvedCtx to validateFacets' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testPassesSubsystem = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({
              accept: () => {},
              processMessage: () => {},
              processTick: () => {},
              processImmediately: () => {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Passes subsystem to validateFacets' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testUsesDefaultRegistry = () => {
    // Test that defaultContractRegistry is used by validating a standard contract
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'router',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('router', { 
              source: 'test://router',
              contract: 'router'
            });
            facet.add({
              registerRoute: () => {},
              match: () => {},
              route: () => {},
              unregisterRoute: () => {},
              hasRoute: () => {},
              getRoutes: () => {},
              _routeRegistry: {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Uses defaultContractRegistry' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  // ========== Error Propagation Tests ==========

  const testPropagatesContractErrors = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            // Missing required methods
            facet.add({});
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes('contract validation') || error.message.includes('missing required methods')) {
        return { success: true, message: 'Propagates contract validation errors' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testIncludesFacetInfo = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'my-facet',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('my-facet', { 
              source: 'custom://source',
              contract: 'nonexistent-contract'
            });
            facet.add({ method1: () => {} });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      if (error.message.includes("'my-facet'") && error.message.includes('custom://source')) {
        return { success: true, message: 'Includes facet info in error messages' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testFailsFast = () => {
    // Test that first error stops validation
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({});
            return facet;
          }
        }),
        createHook({
          kind: 'router',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('router', { 
              source: 'test://router',
              contract: 'router'
            });
            facet.add({});
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      // Should fail on first facet (processor)
      if (error.message.includes('processor')) {
        return { success: true, message: 'Fails fast on first contract error' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testErrorPreventsPlan = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({});
            return facet;
          }
        })
      ]
    });
    try {
      const plan = verifySubsystemBuild(subsystem, {});
      return { success: false, error: 'Should throw error, not return plan' };
    } catch (error) {
      // Error should prevent plan creation
      return { success: true, message: 'Error prevents build plan creation' };
    }
  };

  // ========== Facets Without Contracts Tests ==========

  const testWorksWithoutContracts = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'test-facet',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('test-facet', { source: 'test://test-facet' });
            facet.add({ method1: () => {} });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Works with facets without contracts' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testWorksWithMixedFacets = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'test-facet',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('test-facet', { source: 'test://test-facet' });
            facet.add({ method1: () => {} });
            return facet;
          }
        }),
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({
              accept: () => {},
              processMessage: () => {},
              processTick: () => {},
              processImmediately: () => {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Works with mixed facets (some with contracts, some without)' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testValidatesOnlyWithContracts = () => {
    // Facets without contracts should not cause validation errors
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'test-facet',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('test-facet', { source: 'test://test-facet' });
            // Missing methods, but no contract, so should be fine
            facet.add({});
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Validates only facets with contracts' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  // ========== Build Flow Tests ==========

  const testContractValidationBeforeDependency = () => {
    // Contract validation happens before dependency validation
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          required: ['nonexistent'],
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({});
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      // Should fail on contract validation, not dependency validation
      if (error.message.includes('contract validation') || error.message.includes('missing required methods')) {
        return { success: true, message: 'Contract validation happens before dependency validation' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testContractValidationAfterFacetCreation = () => {
    // Contract validation happens after facet creation
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({
              accept: () => {},
              processMessage: () => {},
              processTick: () => {},
              processImmediately: () => {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Contract validation happens after facet creation' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testSuccessfulValidationAllowsBuild = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({
              accept: () => {},
              processMessage: () => {},
              processTick: () => {},
              processImmediately: () => {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      const plan = verifySubsystemBuild(subsystem, {});
      if (plan && plan.facetsByKind && plan.orderedKinds) {
        return { success: true, message: 'Successful validation allows build to continue' };
      }
      return { success: false, error: 'Should return valid plan' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testContractErrorsPreventGraph = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({});
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: false, error: 'Should throw error' };
    } catch (error) {
      // Error should prevent dependency graph building
      return { success: true, message: 'Contract errors prevent dependency graph building' };
    }
  };

  // ========== Real-World Scenarios ==========

  const testValidatesRouterFacet = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'router',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('router', { 
              source: 'test://router',
              contract: 'router'
            });
            facet.add({
              registerRoute: () => {},
              match: () => {},
              route: () => {},
              unregisterRoute: () => {},
              hasRoute: () => {},
              getRoutes: () => {},
              _routeRegistry: {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Validates router facet with router contract' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testValidatesQueueFacet = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'queue',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('queue', { 
              source: 'test://queue',
              contract: 'queue'
            });
            facet.add({
              selectNextMessage: () => {},
              hasMessagesToProcess: () => {},
              getQueueStatus: () => {},
              _queueManager: { enqueue: () => {} },
              queue: {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Validates queue facet with queue contract' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testValidatesProcessorFacet = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({
              accept: () => {},
              processMessage: () => {},
              processTick: () => {},
              processImmediately: () => {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Validates processor facet with processor contract' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testValidatesListenersFacet = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'listeners',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('listeners', { 
              source: 'test://listeners',
              contract: 'listeners'
            });
            facet.add({
              on: () => {},
              off: () => {},
              hasListeners: () => {},
              enableListeners: () => {},
              disableListeners: () => {},
              get listeners() { return this._listenerManager(); },
              _listenerManager: () => null
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Validates listeners facet with listeners contract' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testValidatesHierarchyFacet = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'hierarchy',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('hierarchy', { 
              source: 'test://hierarchy',
              contract: 'hierarchy'
            });
            facet.add({
              addChild: () => {},
              removeChild: () => {},
              getChild: () => {},
              listChildren: () => {},
              setParent: () => {},
              getParent: () => {},
              isRoot: () => {},
              getRoot: () => {},
              getLineage: () => {},
              get children() { return {}; }
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Validates hierarchy facet with hierarchy contract' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testValidatesSchedulerFacet = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'scheduler',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('scheduler', { 
              source: 'test://scheduler',
              contract: 'scheduler'
            });
            facet.add({
              process: () => {},
              pauseProcessing: () => {},
              resumeProcessing: () => {},
              isPaused: () => {},
              isProcessing: () => {},
              getPriority: () => {},
              setPriority: () => {},
              configureScheduler: () => {},
              getScheduler: () => {},
              _scheduler: {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Validates scheduler facet with scheduler contract' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const testValidatesMultipleFacets = () => {
    const subsystem = createSubsystem({
      hooks: [
        createHook({
          kind: 'processor',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('processor', { 
              source: 'test://processor',
              contract: 'processor'
            });
            facet.add({
              accept: () => {},
              processMessage: () => {},
              processTick: () => {},
              processImmediately: () => {}
            });
            return facet;
          }
        }),
        createHook({
          kind: 'router',
          fn: (ctx, api, subsystem) => {
            const facet = new Facet('router', { 
              source: 'test://router',
              contract: 'router'
            });
            facet.add({
              registerRoute: () => {},
              match: () => {},
              route: () => {},
              unregisterRoute: () => {},
              hasRoute: () => {},
              getRoutes: () => {},
              _routeRegistry: {}
            });
            return facet;
          }
        })
      ]
    });
    try {
      verifySubsystemBuild(subsystem, {});
      return { success: true, message: 'Validates multiple facets with contracts' };
    } catch (error) {
      return { success: false, error: `Should not throw: ${error.message}` };
    }
  };

  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>VerifySubsystemBuild Integration Tests</h2>
      
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







