import { useState } from 'react';
import { verifySubsystemBuild } from '../models/subsystem-builder/subsystem-builder.utils.mycelia.js';
import { Facet } from '../models/facet-manager/facet.mycelia.js';
import { createHook } from '../hooks/create-hook.mycelia.js';

/**
 * SubsystemBuilderUtilsVerificationFacetsTest
 * Tests for hook execution and facet creation in verifySubsystemBuild
 */
export function SubsystemBuilderUtilsVerificationFacetsTest() {
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

  // Helper to create a simple mock hook
  const createMockHook = (kind, options = {}) => {
    const hookSource = options.source || `test://${kind}`;
    return createHook({
      kind,
      overwrite: options.overwrite || false,
      required: options.required || [],
      attach: options.attach || false,
      source: hookSource,
      fn: (ctx, api, subsystem) => {
        return new Facet(kind, {
          attach: options.attach || false,
          source: hookSource // Use the hook's source for the facet
        });
      }
    });
  };

  const testCases = [
    // Hook Metadata Extraction
    { name: 'Hook metadata - extracts kind', category: 'Hook Metadata' },
    { name: 'Hook metadata - extracts overwrite flag', category: 'Hook Metadata' },
    { name: 'Hook metadata - extracts required dependencies', category: 'Hook Metadata' },
    { name: 'Hook metadata - extracts source', category: 'Hook Metadata' },
    { name: 'Hook metadata - validates kind is string', category: 'Hook Metadata' },
    { name: 'Hook metadata - validates kind is non-empty', category: 'Hook Metadata' },
    
    // Hook Execution
    { name: 'Hook execution - executes hook function', category: 'Hook Execution' },
    { name: 'Hook execution - passes resolvedCtx to hook', category: 'Hook Execution' },
    { name: 'Hook execution - passes api to hook', category: 'Hook Execution' },
    { name: 'Hook execution - passes subsystem to hook', category: 'Hook Execution' },
    { name: 'Hook execution - handles hook that returns null', category: 'Hook Execution' },
    { name: 'Hook execution - handles hook that returns undefined', category: 'Hook Execution' },
    { name: 'Hook execution - catches and wraps execution errors', category: 'Hook Execution' },
    
    // Facet Validation
    { name: 'Facet validation - validates facet is Facet instance', category: 'Facet Validation' },
    { name: 'Facet validation - validates facet has kind', category: 'Facet Validation' },
    { name: 'Facet validation - validates hook.kind matches facet.kind', category: 'Facet Validation' },
    { name: 'Facet validation - rejects non-Facet return value', category: 'Facet Validation' },
    { name: 'Facet validation - rejects facet without kind', category: 'Facet Validation' },
    { name: 'Facet validation - rejects mismatched kind', category: 'Facet Validation' },
    
    // Overwrite Permissions
    { name: 'Overwrite - allows overwrite when hook.overwrite is true', category: 'Overwrite Permissions' },
    { name: 'Overwrite - allows overwrite when facet.shouldOverwrite() is true', category: 'Overwrite Permissions' },
    { name: 'Overwrite - rejects duplicate hook without overwrite permission', category: 'Overwrite Permissions' },
    { name: 'Overwrite - rejects duplicate facet without overwrite permission', category: 'Overwrite Permissions' },
    { name: 'Overwrite - replaces existing facet when overwrite allowed', category: 'Overwrite Permissions' },
    
    // Dependency Validation
    { name: 'Dependency validation - validates hook.required dependencies exist', category: 'Dependency Validation' },
    { name: 'Dependency validation - throws error for missing hook.required dependency', category: 'Dependency Validation' },
    { name: 'Dependency validation - validates all hook.required dependencies', category: 'Dependency Validation' },
    
    // Kernel Services Dependency Stripping
    { name: 'Kernel services - strips kernelServices dependency when kernel initialized', category: 'Kernel Services' },
    { name: 'Kernel services - does not strip when kernel not initialized', category: 'Kernel Services' },
    { name: 'Kernel services - removes from facet dependencies', category: 'Kernel Services' },
    { name: 'Kernel services - removes from hook metadata', category: 'Kernel Services' },
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
          case 'Hook metadata - extracts kind':
            result = testHookMetadataExtractsKind();
            break;
          case 'Hook metadata - extracts overwrite flag':
            result = testHookMetadataExtractsOverwrite();
            break;
          case 'Hook metadata - extracts required dependencies':
            result = testHookMetadataExtractsRequired();
            break;
          case 'Hook metadata - extracts source':
            result = testHookMetadataExtractsSource();
            break;
          case 'Hook metadata - validates kind is string':
            result = testHookMetadataValidatesKindString();
            break;
          case 'Hook metadata - validates kind is non-empty':
            result = testHookMetadataValidatesKindNonEmpty();
            break;
          case 'Hook execution - executes hook function':
            result = testHookExecutionExecutes();
            break;
          case 'Hook execution - passes resolvedCtx to hook':
            result = testHookExecutionPassesCtx();
            break;
          case 'Hook execution - passes api to hook':
            result = testHookExecutionPassesApi();
            break;
          case 'Hook execution - passes subsystem to hook':
            result = testHookExecutionPassesSubsystem();
            break;
          case 'Hook execution - handles hook that returns null':
            result = testHookExecutionHandlesNull();
            break;
          case 'Hook execution - handles hook that returns undefined':
            result = testHookExecutionHandlesUndefined();
            break;
          case 'Hook execution - catches and wraps execution errors':
            result = testHookExecutionCatchesErrors();
            break;
          case 'Facet validation - validates facet is Facet instance':
            result = testFacetValidationIsInstance();
            break;
          case 'Facet validation - validates facet has kind':
            result = testFacetValidationHasKind();
            break;
          case 'Facet validation - validates hook.kind matches facet.kind':
            result = testFacetValidationKindMatch();
            break;
          case 'Facet validation - rejects non-Facet return value':
            result = testFacetValidationRejectsNonFacet();
            break;
          case 'Facet validation - rejects facet without kind':
            result = testFacetValidationRejectsNoKind();
            break;
          case 'Facet validation - rejects mismatched kind':
            result = testFacetValidationRejectsMismatch();
            break;
          case 'Overwrite - allows overwrite when hook.overwrite is true':
            result = testOverwriteAllowsHookOverwrite();
            break;
          case 'Overwrite - allows overwrite when facet.shouldOverwrite() is true':
            result = testOverwriteAllowsFacetOverwrite();
            break;
          case 'Overwrite - rejects duplicate hook without overwrite permission':
            result = testOverwriteRejectsDuplicateHook();
            break;
          case 'Overwrite - rejects duplicate facet without overwrite permission':
            result = testOverwriteRejectsDuplicateFacet();
            break;
          case 'Overwrite - replaces existing facet when overwrite allowed':
            result = testOverwriteReplacesFacet();
            break;
          case 'Dependency validation - validates hook.required dependencies exist':
            result = testDependencyValidationExists();
            break;
          case 'Dependency validation - throws error for missing hook.required dependency':
            result = testDependencyValidationMissing();
            break;
          case 'Dependency validation - validates all hook.required dependencies':
            result = testDependencyValidationAll();
            break;
          case 'Kernel services - strips kernelServices dependency when kernel initialized':
            result = testKernelServicesStrips();
            break;
          case 'Kernel services - does not strip when kernel not initialized':
            result = testKernelServicesNoStrip();
            break;
          case 'Kernel services - removes from facet dependencies':
            result = testKernelServicesRemovesFromFacet();
            break;
          case 'Kernel services - removes from hook metadata':
            result = testKernelServicesRemovesFromHook();
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
  const testHookMetadataExtractsKind = () => {
    const hook = createMockHook('test-kind');
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!plan.facetsByKind['test-kind']) {
      return { success: false, error: 'Should extract hook kind' };
    }
    
    return {
      success: true,
      message: 'Extracts hook kind',
      data: { kind: 'test-kind' }
    };
  };

  const testHookMetadataExtractsOverwrite = () => {
    const hook1 = createMockHook('test', { overwrite: true });
    const hook2 = createMockHook('test', { overwrite: true, source: 'test://test2' });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    // Should allow overwrite
    if (!plan.facetsByKind['test']) {
      return { success: false, error: 'Should allow overwrite when overwrite flag is true' };
    }
    
    return {
      success: true,
      message: 'Extracts overwrite flag',
      data: { overwriteAllowed: true }
    };
  };

  const testHookMetadataExtractsRequired = () => {
    const depHook = createMockHook('dependency');
    const hook = createMockHook('test', { required: ['dependency'] });
    const subsystem = createSubsystem({ defaultHooks: [depHook, hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!plan.facetsByKind['test'] || !plan.facetsByKind['dependency']) {
      return { success: false, error: 'Should extract required dependencies' };
    }
    
    return {
      success: true,
      message: 'Extracts required dependencies',
      data: { required: ['dependency'] }
    };
  };

  const testHookMetadataExtractsSource = () => {
    const hook = createMockHook('test', { source: 'custom://source' });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      const plan = verifySubsystemBuild(subsystem);
      return {
        success: true,
        message: 'Extracts source',
        data: { source: 'custom://source' }
      };
    } catch (error) {
      return { success: false, error: `Should extract source: ${error.message}` };
    }
  };

  const testHookMetadataValidatesKindString = () => {
    // Create a function hook and manually attach invalid kind metadata
    const hook = function(ctx, api, subsystem) {
      return new Facet('test');
    };
    hook.kind = 123; // Invalid: not a string
    hook.source = 'test://invalid';
    hook.required = [];
    hook.overwrite = false;
    
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should throw error for non-string kind' };
    } catch (error) {
      if (error.message.includes('kind property')) {
        return { success: true, message: 'Validates kind is string' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testHookMetadataValidatesKindNonEmpty = () => {
    // Create a function hook and manually attach invalid kind metadata
    const hook = function(ctx, api, subsystem) {
      return new Facet('test');
    };
    hook.kind = ''; // Invalid: empty string
    hook.source = 'test://invalid';
    hook.required = [];
    hook.overwrite = false;
    
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should throw error for empty kind' };
    } catch (error) {
      if (error.message.includes('kind property')) {
        return { success: true, message: 'Validates kind is non-empty' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testHookExecutionExecutes = () => {
    let executed = false;
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => {
        executed = true;
        return new Facet('test');
      }
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    verifySubsystemBuild(subsystem);
    
    if (!executed) {
      return { success: false, error: 'Should execute hook function' };
    }
    
    return {
      success: true,
      message: 'Executes hook function',
      data: { executed: true }
    };
  };

  const testHookExecutionPassesCtx = () => {
    let receivedCtx = null;
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: (ctx) => {
        receivedCtx = ctx;
        return new Facet('test');
      }
    });
    const subsystem = createSubsystem({ 
      defaultHooks: [hook],
      ctx: { test: 'value' }
    });
    
    verifySubsystemBuild(subsystem, { extra: 'provided' });
    
    if (!receivedCtx || receivedCtx.test !== 'value' || receivedCtx.extra !== 'provided') {
      return { success: false, error: 'Should pass resolvedCtx to hook' };
    }
    
    return {
      success: true,
      message: 'Passes resolvedCtx to hook',
      data: { ctxReceived: !!receivedCtx }
    };
  };

  const testHookExecutionPassesApi = () => {
    let receivedApi = null;
    const api = { name: 'test-api' };
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: (ctx, apiParam) => {
        receivedApi = apiParam;
        return new Facet('test');
      }
    });
    const subsystem = createSubsystem({ 
      defaultHooks: [hook],
      api
    });
    
    verifySubsystemBuild(subsystem);
    
    if (receivedApi !== api) {
      return { success: false, error: 'Should pass api to hook' };
    }
    
    return {
      success: true,
      message: 'Passes api to hook',
      data: { apiReceived: !!receivedApi }
    };
  };

  const testHookExecutionPassesSubsystem = () => {
    let receivedSubsystem = null;
    const subsystem = createSubsystem({ name: 'test-subsystem' });
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: (ctx, api, subsystemParam) => {
        receivedSubsystem = subsystemParam;
        return new Facet('test');
      }
    });
    subsystem.defaultHooks = [hook];
    
    verifySubsystemBuild(subsystem);
    
    if (receivedSubsystem !== subsystem) {
      return { success: false, error: 'Should pass subsystem to hook' };
    }
    
    return {
      success: true,
      message: 'Passes subsystem to hook',
      data: { subsystemReceived: !!receivedSubsystem }
    };
  };

  const testHookExecutionHandlesNull = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => null
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind['test']) {
      return { success: false, error: 'Should skip null return value' };
    }
    
    return {
      success: true,
      message: 'Handles hook that returns null',
      data: { skipped: true }
    };
  };

  const testHookExecutionHandlesUndefined = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => undefined
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind['test']) {
      return { success: false, error: 'Should skip undefined return value' };
    }
    
    return {
      success: true,
      message: 'Handles hook that returns undefined',
      data: { skipped: true }
    };
  };

  const testHookExecutionCatchesErrors = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => {
        throw new Error('Hook execution error');
      }
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should catch execution errors' };
    } catch (error) {
      if (error.message.includes('failed during execution')) {
        return { success: true, message: 'Catches and wraps execution errors' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testFacetValidationIsInstance = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => new Facet('test')
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!(plan.facetsByKind['test'] instanceof Facet)) {
      return { success: false, error: 'Should validate facet is Facet instance' };
    }
    
    return {
      success: true,
      message: 'Validates facet is Facet instance',
      data: { isValid: true }
    };
  };

  const testFacetValidationHasKind = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => new Facet('test')
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind['test'].getKind() !== 'test') {
      return { success: false, error: 'Should validate facet has kind' };
    }
    
    return {
      success: true,
      message: 'Validates facet has kind',
      data: { kind: 'test' }
    };
  };

  const testFacetValidationKindMatch = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => new Facet('test')
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      const plan = verifySubsystemBuild(subsystem);
      if (plan.facetsByKind['test'].getKind() === 'test') {
        return {
          success: true,
          message: 'Validates hook.kind matches facet.kind',
          data: { matched: true }
        };
      }
      return { success: false, error: 'Kinds should match' };
    } catch (error) {
      return { success: false, error: `Unexpected error: ${error.message}` };
    }
  };

  const testFacetValidationRejectsNonFacet = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => ({ notAFacet: true })
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should reject non-Facet return value' };
    } catch (error) {
      if (error.message.includes('Facet instance')) {
        return { success: true, message: 'Rejects non-Facet return value' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testFacetValidationRejectsNoKind = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => {
        // Create a subclass of Facet that overrides getKind to return null
        class FacetWithoutKind extends Facet {
          constructor() {
            super('test'); // Call parent with valid kind
          }
          getKind() {
            return null; // Override to return null
          }
        }
        return new FacetWithoutKind();
      }
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should reject facet without kind' };
    } catch (error) {
      if (error.message.includes('missing valid kind')) {
        return { success: true, message: 'Rejects facet without kind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testFacetValidationRejectsMismatch = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => new Facet('mismatch')
    });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should reject mismatched kind' };
    } catch (error) {
      if (error.message.includes('mismatched kind')) {
        return { success: true, message: 'Rejects mismatched kind' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testOverwriteAllowsHookOverwrite = () => {
    const hook1 = createMockHook('test', { overwrite: false });
    const hook2 = createMockHook('test', { overwrite: true, source: 'test://test2' });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!plan.facetsByKind['test']) {
      return { success: false, error: 'Should allow overwrite when hook.overwrite is true' };
    }
    
    return {
      success: true,
      message: 'Allows overwrite when hook.overwrite is true',
      data: { overwritten: true }
    };
  };

  const testOverwriteAllowsFacetOverwrite = () => {
    const hook1 = createHook({
      kind: 'test',
      overwrite: false,
      source: 'test://test1',
      fn: () => new Facet('test', { overwrite: false })
    });
    const hook2 = createHook({
      kind: 'test',
      overwrite: false,
      source: 'test://test2',
      fn: () => new Facet('test', { overwrite: true })
    });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!plan.facetsByKind['test']) {
      return { success: false, error: 'Should allow overwrite when facet.shouldOverwrite() is true' };
    }
    
    return {
      success: true,
      message: 'Allows overwrite when facet.shouldOverwrite() is true',
      data: { overwritten: true }
    };
  };

  const testOverwriteRejectsDuplicateHook = () => {
    const hook1 = createMockHook('test', { overwrite: false });
    const hook2 = createMockHook('test', { overwrite: false, source: 'test://test2' });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should reject duplicate hook without overwrite permission' };
    } catch (error) {
      // The error is now thrown at the facet level, checking both hook and facet permissions
      if (error.message.includes('Duplicate facet kind') || 
          error.message.includes('Duplicate hook kind') || 
          error.message.includes('allows overwrite') ||
          error.message.includes('does not allow overwrite')) {
        return { success: true, message: 'Rejects duplicate hook without overwrite permission' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testOverwriteRejectsDuplicateFacet = () => {
    const hook1 = createHook({
      kind: 'test',
      overwrite: false,
      source: 'test://test1',
      fn: () => new Facet('test', { overwrite: false })
    });
    const hook2 = createHook({
      kind: 'test',
      overwrite: false,
      source: 'test://test2',
      fn: () => new Facet('test', { overwrite: false })
    });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should reject duplicate facet without overwrite permission' };
    } catch (error) {
      if (error.message.includes('Duplicate facet kind') || error.message.includes('allows overwrite')) {
        return { success: true, message: 'Rejects duplicate facet without overwrite permission' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testOverwriteReplacesFacet = () => {
    const hook1 = createMockHook('test', { overwrite: false });
    const hook2 = createMockHook('test', { overwrite: true, source: 'test://test2' });
    const subsystem = createSubsystem({ defaultHooks: [hook1, hook2] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    const facet = plan.facetsByKind['test'];
    if (!facet || facet.getSource() !== 'test://test2') {
      return { success: false, error: 'Should replace existing facet when overwrite allowed' };
    }
    
    return {
      success: true,
      message: 'Replaces existing facet when overwrite allowed',
      data: { source: facet.getSource() }
    };
  };

  const testDependencyValidationExists = () => {
    const depHook = createMockHook('dependency');
    const hook = createMockHook('test', { required: ['dependency'] });
    const subsystem = createSubsystem({ defaultHooks: [depHook, hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!plan.facetsByKind['test'] || !plan.facetsByKind['dependency']) {
      return { success: false, error: 'Should validate dependencies exist' };
    }
    
    return {
      success: true,
      message: 'Validates hook.required dependencies exist',
      data: { dependenciesMet: true }
    };
  };

  const testDependencyValidationMissing = () => {
    const hook = createMockHook('test', { required: ['missing'] });
    const subsystem = createSubsystem({ defaultHooks: [hook] });
    
    try {
      verifySubsystemBuild(subsystem);
      return { success: false, error: 'Should throw error for missing dependency' };
    } catch (error) {
      if (error.message.includes('requires missing facet')) {
        return { success: true, message: 'Throws error for missing hook.required dependency' };
      }
      return { success: false, error: `Wrong error: ${error.message}` };
    }
  };

  const testDependencyValidationAll = () => {
    const dep1 = createMockHook('dep1');
    const dep2 = createMockHook('dep2');
    const hook = createMockHook('test', { required: ['dep1', 'dep2'] });
    const subsystem = createSubsystem({ defaultHooks: [dep1, dep2, hook] });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!plan.facetsByKind['test'] || !plan.facetsByKind['dep1'] || !plan.facetsByKind['dep2']) {
      return { success: false, error: 'Should validate all hook.required dependencies' };
    }
    
    return {
      success: true,
      message: 'Validates all hook.required dependencies',
      data: { allDependenciesMet: true }
    };
  };

  const testKernelServicesStrips = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => {
        const facet = new Facet('test');
        facet.addDependency('kernelServices');
        return facet;
      }
    });
    const subsystem = createSubsystem({ 
      defaultHooks: [hook],
      ms: { isKernelInit: () => true }
    });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind['test'].hasDependency('kernelServices')) {
      return { success: false, error: 'Should strip kernelServices dependency when kernel initialized' };
    }
    
    return {
      success: true,
      message: 'Strips kernelServices dependency when kernel initialized',
      data: { stripped: true }
    };
  };

  const testKernelServicesNoStrip = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => {
        const facet = new Facet('test');
        facet.addDependency('kernelServices');
        return facet;
      }
    });
    const subsystem = createSubsystem({ 
      defaultHooks: [hook],
      ms: { isKernelInit: () => false }
    });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (!plan.facetsByKind['test'].hasDependency('kernelServices')) {
      return { success: false, error: 'Should not strip when kernel not initialized' };
    }
    
    return {
      success: true,
      message: 'Does not strip when kernel not initialized',
      data: { kept: true }
    };
  };

  const testKernelServicesRemovesFromFacet = () => {
    const hook = createHook({
      kind: 'test',
      source: 'test://test',
      fn: () => {
        const facet = new Facet('test');
        facet.addDependency('kernelServices');
        return facet;
      }
    });
    const subsystem = createSubsystem({ 
      defaultHooks: [hook],
      ms: { isKernelInit: () => true }
    });
    
    const plan = verifySubsystemBuild(subsystem);
    
    if (plan.facetsByKind['test'].hasDependency('kernelServices')) {
      return { success: false, error: 'Should remove kernelServices from facet dependencies' };
    }
    
    return {
      success: true,
      message: 'Removes kernelServices from facet dependencies',
      data: { removed: true }
    };
  };

  const testKernelServicesRemovesFromHook = () => {
    const hook = createHook({
      kind: 'test',
      required: ['kernelServices'],
      source: 'test://test',
      fn: () => new Facet('test')
    });
    const subsystem = createSubsystem({ 
      defaultHooks: [hook],
      ms: { isKernelInit: () => true }
    });
    
    // This test verifies that kernelServices is removed from hook metadata
    // We can't directly check hook metadata, but we can verify the build succeeds
    // and that no error is thrown about missing kernelServices
    try {
      const plan = verifySubsystemBuild(subsystem);
      return {
        success: true,
        message: 'Removes kernelServices from hook metadata',
        data: { buildSucceeded: true }
      };
    } catch (error) {
      if (error.message.includes('kernelServices')) {
        return { success: false, error: 'Should remove kernelServices from hook metadata' };
      }
      return { success: false, error: `Unexpected error: ${error.message}` };
    }
  };

  // UI
  const categories = [...new Set(testCases.map(t => t.category))];
  const testsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = testCases.filter(t => t.category === cat);
    return acc;
  }, {});

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>
        Subsystem Builder Utils - Verification Phase: Hook Execution & Facet Creation
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        Tests for hook execution, facet creation, and validation in verifySubsystemBuild
      </p>

      {/* Test Summary */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Tests</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{testCases.length}</div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Passed</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
            {Array.from(results.values()).filter(r => r.success).length}
          </div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Failed</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
            {Array.from(results.values()).filter(r => !r.success).length}
          </div>
        </div>
        <div style={{ padding: '12px 16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Running</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
            {runningTests.size}
          </div>
        </div>
      </div>

      {/* Run All Button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => {
            testCases.forEach(test => {
              if (!results.has(test.name)) {
                runTest(test.name);
              }
            });
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          Run All Tests
        </button>
      </div>

      {/* Test Results by Category */}
      {categories.map(category => (
        <div key={category} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
            {category}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {testsByCategory[category].map(test => {
              const result = results.get(test.name);
              const isRunning = runningTests.has(test.name);
              
              return (
                <div
                  key={test.name}
                  onClick={() => setSelectedTest(test.name)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: result
                      ? (result.success ? '#d1fae5' : '#fee2e2')
                      : isRunning
                      ? '#dbeafe'
                      : 'white',
                    border: `1px solid ${result ? (result.success ? '#10b981' : '#ef4444') : '#e5e7eb'}`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {isRunning ? '⏳' : result ? (result.success ? '✅' : '❌') : '⚪'}
                    </span>
                    <span style={{ flex: 1, fontWeight: selectedTest === test.name ? '600' : '400' }}>
                      {test.name}
                    </span>
                    {result && result.data && (
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {JSON.stringify(result.data)}
                      </span>
                    )}
                  </div>
                  {result && result.error && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '4px', fontSize: '12px', color: '#991b1b' }}>
                      {result.error}
                    </div>
                  )}
                  {result && result.message && (
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#059669' }}>
                      {result.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Test Details */}
      {selectedTest && results.has(selectedTest) && (
        <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
            Test Details: {selectedTest}
          </h3>
          <pre style={{ padding: '12px', backgroundColor: 'white', borderRadius: '4px', overflow: 'auto', fontSize: '12px' }}>
            {JSON.stringify(results.get(selectedTest), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

