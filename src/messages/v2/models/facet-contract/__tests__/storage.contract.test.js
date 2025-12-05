/**
 * Storage Contract Tests
 */

import { describe, it, expect } from 'vitest';
import { storageContract } from '../storage.contract.mycelia.js';
import { MemoryStorageBackend } from '../../../hooks/storage/memory/memory-storage-backend.mycelia.js';

describe('Storage Contract', () => {
  const ctx = {};
  const api = { name: 'test-subsystem' };
  const subsystem = {};

  it('enforces required methods', () => {
    const validFacet = {
      get: async () => ({ success: true }),
      set: async () => ({ success: true }),
      delete: async () => ({ success: true }),
      has: async () => ({ success: true, exists: true }),
      getMany: async () => ({ success: true, data: new Map() }),
      setMany: async () => ({ success: true, results: new Map() }),
      deleteMany: async () => ({ success: true, results: new Map() }),
      list: async () => ({ success: true, keys: [] }),
      query: async () => ({ success: true, results: [] }),
      count: async () => ({ success: true, count: 0 }),
      createNamespace: async () => ({ success: true }),
      deleteNamespace: async () => ({ success: true }),
      listNamespaces: async () => ({ success: true, namespaces: [] }),
      getMetadata: async () => ({ success: true, metadata: {} }),
      setMetadata: async () => ({ success: true }),
      clear: async () => ({ success: true }),
      getStatus: async () => ({ success: true, status: { healthy: true } }),
      _storageBackend: new MemoryStorageBackend(),
      _config: {}
    };

    expect(() => {
      storageContract.enforce(ctx, api, subsystem, validFacet);
    }).not.toThrow();
  });

  it('throws error if required method is missing', () => {
    const invalidFacet = {
      get: async () => ({ success: true }),
      // Missing 'set' method
      _storageBackend: new MemoryStorageBackend(),
      _config: {}
    };

    expect(() => {
      storageContract.enforce(ctx, api, subsystem, invalidFacet);
    }).toThrow("FacetContract 'storage': facet is missing required methods");
  });

  it('throws error if _storageBackend is missing', () => {
    const invalidFacet = {
      get: async () => ({ success: true }),
      set: async () => ({ success: true }),
      delete: async () => ({ success: true }),
      has: async () => ({ success: true, exists: true }),
      getMany: async () => ({ success: true, data: new Map() }),
      setMany: async () => ({ success: true, results: new Map() }),
      deleteMany: async () => ({ success: true, results: new Map() }),
      list: async () => ({ success: true, keys: [] }),
      query: async () => ({ success: true, results: [] }),
      count: async () => ({ success: true, count: 0 }),
      createNamespace: async () => ({ success: true }),
      deleteNamespace: async () => ({ success: true }),
      listNamespaces: async () => ({ success: true, namespaces: [] }),
      getMetadata: async () => ({ success: true, metadata: {} }),
      setMetadata: async () => ({ success: true }),
      clear: async () => ({ success: true }),
      getStatus: async () => ({ success: true, status: { healthy: true } }),
      // Missing _storageBackend
      _config: {}
    };

    expect(() => {
      storageContract.enforce(ctx, api, subsystem, invalidFacet);
    }).toThrow('missing required properties: _storageBackend');
  });

  it('throws error if _config is missing', () => {
    const invalidFacet = {
      get: async () => ({ success: true }),
      set: async () => ({ success: true }),
      delete: async () => ({ success: true }),
      has: async () => ({ success: true, exists: true }),
      getMany: async () => ({ success: true, data: new Map() }),
      setMany: async () => ({ success: true, results: new Map() }),
      deleteMany: async () => ({ success: true, results: new Map() }),
      list: async () => ({ success: true, keys: [] }),
      query: async () => ({ success: true, results: [] }),
      count: async () => ({ success: true, count: 0 }),
      createNamespace: async () => ({ success: true }),
      deleteNamespace: async () => ({ success: true }),
      listNamespaces: async () => ({ success: true, namespaces: [] }),
      getMetadata: async () => ({ success: true, metadata: {} }),
      setMetadata: async () => ({ success: true }),
      clear: async () => ({ success: true }),
      getStatus: async () => ({ success: true, status: { healthy: true } }),
      _storageBackend: new MemoryStorageBackend()
      // Missing _config
    };

    expect(() => {
      storageContract.enforce(ctx, api, subsystem, invalidFacet);
    }).toThrow('missing required properties: _config');
  });

  it('validates optional properties have correct types', () => {
    const invalidFacet = {
      get: async () => ({ success: true }),
      set: async () => ({ success: true }),
      delete: async () => ({ success: true }),
      has: async () => ({ success: true, exists: true }),
      getMany: async () => ({ success: true, data: new Map() }),
      setMany: async () => ({ success: true, results: new Map() }),
      deleteMany: async () => ({ success: true, results: new Map() }),
      list: async () => ({ success: true, keys: [] }),
      query: async () => ({ success: true, results: [] }),
      count: async () => ({ success: true, count: 0 }),
      createNamespace: async () => ({ success: true }),
      deleteNamespace: async () => ({ success: true }),
      listNamespaces: async () => ({ success: true, namespaces: [] }),
      getMetadata: async () => ({ success: true, metadata: {} }),
      setMetadata: async () => ({ success: true }),
      clear: async () => ({ success: true }),
      getStatus: async () => ({ success: true, status: { healthy: true } }),
      _storageBackend: new MemoryStorageBackend(),
      _config: {},
      supportsTransactions: 'not-a-boolean' // Invalid type
    };

    expect(() => {
      storageContract.enforce(ctx, api, subsystem, invalidFacet);
    }).toThrow('supportsTransactions must be a boolean');
  });

  it('validates _storageBackend type in custom validation', () => {
    const invalidFacet = {
      get: async () => ({ success: true }),
      set: async () => ({ success: true }),
      delete: async () => ({ success: true }),
      has: async () => ({ success: true, exists: true }),
      getMany: async () => ({ success: true, data: new Map() }),
      setMany: async () => ({ success: true, results: new Map() }),
      deleteMany: async () => ({ success: true, results: new Map() }),
      list: async () => ({ success: true, keys: [] }),
      query: async () => ({ success: true, results: [] }),
      count: async () => ({ success: true, count: 0 }),
      createNamespace: async () => ({ success: true }),
      deleteNamespace: async () => ({ success: true }),
      listNamespaces: async () => ({ success: true, namespaces: [] }),
      getMetadata: async () => ({ success: true, metadata: {} }),
      setMetadata: async () => ({ success: true }),
      clear: async () => ({ success: true }),
      getStatus: async () => ({ success: true, status: { healthy: true } }),
      _storageBackend: null, // Invalid: null is not an object
      _config: {}
    };

    expect(() => {
      storageContract.enforce(ctx, api, subsystem, invalidFacet);
    }).toThrow('Storage facet _storageBackend must be an object');
  });
});

