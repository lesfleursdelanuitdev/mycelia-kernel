/**
 * useSQLiteStorage Hook Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSQLiteStorage } from '../use-sqlite-storage.mycelia.js';
import { BaseSubsystem } from '../../../../models/base-subsystem/base.subsystem.mycelia.js';
import { MessageSystem } from '../../../../models/message-system/message-system.v2.mycelia.js';
import { unlinkSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

describe('useSQLiteStorage Hook', () => {
  let messageSystem;
  let subsystem;
  const testDbPath = './test-data/test-storage.db';

  beforeEach(async () => {
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    
    // Ensure test directory exists
    const testDir = dirname(testDbPath);
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    messageSystem = new MessageSystem('test-ms');
    await messageSystem.bootstrap();

    subsystem = new BaseSubsystem('test-service', {
      ms: messageSystem,
      config: {
        storage: {
          dbPath: testDbPath,
          migrate: true,
          walMode: true
        }
      }
    });

    await subsystem
      .use(useSQLiteStorage)
      .build();
  });

  afterEach(async () => {
    if (subsystem) {
      const storage = subsystem.find('storage');
      if (storage && storage._storageBackend) {
        storage._storageBackend.close();
      }
      await subsystem.dispose();
    }
    if (messageSystem) {
      await messageSystem.dispose();
    }

    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it('creates storage facet on subsystem', () => {
    const storage = subsystem.find('storage');
    expect(storage).toBeDefined();
    expect(typeof storage.get).toBe('function');
    expect(typeof storage.set).toBe('function');
    expect(typeof storage.delete).toBe('function');
  });

  it('has required properties', () => {
    const storage = subsystem.find('storage');
    expect(storage._storageBackend).toBeDefined();
    expect(storage._config).toBeDefined();
    expect(storage.supportsTransactions).toBe(true);
    expect(storage.supportsQuery).toBe(true);
    expect(storage.supportsMetadata).toBe(true);
  });

  it('can store and retrieve values', async () => {
    const storage = subsystem.find('storage');
    
    const setResult = await storage.set('test-key', { data: 'test-value' });
    expect(setResult.success).toBe(true);

    const getResult = await storage.get('test-key');
    expect(getResult.success).toBe(true);
    expect(getResult.data).toEqual({ data: 'test-value' });
  });

  it('can check if key exists', async () => {
    const storage = subsystem.find('storage');
    
    await storage.set('test-key', 'value');
    
    const hasResult = await storage.has('test-key');
    expect(hasResult.success).toBe(true);
    expect(hasResult.exists).toBe(true);

    const notHasResult = await storage.has('non-existent');
    expect(notHasResult.success).toBe(true);
    expect(notHasResult.exists).toBe(false);
  });

  it('can delete values', async () => {
    const storage = subsystem.find('storage');
    
    await storage.set('test-key', 'value');
    const deleteResult = await storage.delete('test-key');
    expect(deleteResult.success).toBe(true);

    const getResult = await storage.get('test-key');
    expect(getResult.success).toBe(false);
  });

  it('can use namespaces', async () => {
    const storage = subsystem.find('storage');
    
    await storage.set('key1', 'value1', { namespace: 'ns1' });
    await storage.set('key1', 'value2', { namespace: 'ns2' });

    const result1 = await storage.get('key1', { namespace: 'ns1' });
    expect(result1.data).toBe('value1');

    const result2 = await storage.get('key1', { namespace: 'ns2' });
    expect(result2.data).toBe('value2');
  });

  it('can list keys', async () => {
    const storage = subsystem.find('storage');
    
    await storage.set('key1', 'value1');
    await storage.set('key2', 'value2');
    await storage.set('key3', 'value3');

    const listResult = await storage.list();
    expect(listResult.success).toBe(true);
    expect(listResult.keys.length).toBe(3);
    expect(listResult.keys).toContain('key1');
    expect(listResult.keys).toContain('key2');
    expect(listResult.keys).toContain('key3');
  });

  it('can get status', async () => {
    const storage = subsystem.find('storage');
    
    await storage.set('key1', 'value1');
    await storage.set('key2', 'value2');

    const statusResult = await storage.getStatus();
    expect(statusResult.success).toBe(true);
    expect(statusResult.status.healthy).toBe(true);
    expect(statusResult.status.size).toBe(2);
    expect(statusResult.status.namespaces).toBeGreaterThan(0);
  });

  it('persists data across restarts', async () => {
    const storage = subsystem.find('storage');
    
    await storage.set('persistent-key', { data: 'persistent-value' });
    
    // Close and recreate
    storage._storageBackend.close();
    await subsystem.dispose();
    await messageSystem.dispose();

    // Create new subsystem with same database
    messageSystem = new MessageSystem('test-ms-2');
    await messageSystem.bootstrap();

    subsystem = new BaseSubsystem('test-service-2', {
      ms: messageSystem,
      config: {
        storage: {
          dbPath: testDbPath,
          migrate: false // Already migrated
        }
      }
    });

    await subsystem
      .use(useSQLiteStorage)
      .build();

    const newStorage = subsystem.find('storage');
    const getResult = await newStorage.get('persistent-key');
    expect(getResult.success).toBe(true);
    expect(getResult.data).toEqual({ data: 'persistent-value' });
  });

  it('can handle batch operations', async () => {
    const storage = subsystem.find('storage');
    
    const entries = [
      { key: 'batch1', value: 'value1' },
      { key: 'batch2', value: 'value2' },
      { key: 'batch3', value: 'value3' }
    ];

    const setManyResult = await storage.setMany(entries);
    expect(setManyResult.success).toBe(true);

    const getManyResult = await storage.getMany(['batch1', 'batch2', 'batch3']);
    expect(getManyResult.success).toBe(true);
    expect(getManyResult.data.size).toBe(3);
    expect(getManyResult.data.get('batch1')).toBe('value1');
  });

  it('can create and list namespaces', async () => {
    const storage = subsystem.find('storage');
    
    const createResult = await storage.createNamespace('test-ns');
    expect(createResult.success).toBe(true);

    const listResult = await storage.listNamespaces();
    expect(listResult.success).toBe(true);
    expect(listResult.namespaces).toContain('test-ns');
    expect(listResult.namespaces).toContain('default');
  });

  it('can handle metadata', async () => {
    const storage = subsystem.find('storage');
    
    await storage.set('meta-key', 'value', { metadata: { createdBy: 'test', version: 1 } });

    const metaResult = await storage.getMetadata('meta-key');
    expect(metaResult.success).toBe(true);
    expect(metaResult.metadata.createdBy).toBe('test');
    expect(metaResult.metadata.version).toBe(1);

    await storage.setMetadata('meta-key', { version: 2 });
    const updatedMeta = await storage.getMetadata('meta-key');
    expect(updatedMeta.metadata.version).toBe(2);
    expect(updatedMeta.metadata.createdBy).toBe('test'); // Should be preserved
  });
});



