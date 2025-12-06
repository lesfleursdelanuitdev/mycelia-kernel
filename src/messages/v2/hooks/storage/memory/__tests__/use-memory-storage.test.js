/**
 * useMemoryStorage Hook Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useMemoryStorage } from '../use-memory-storage.mycelia.js';
import { BaseSubsystem } from '../../../../models/base-subsystem/base.subsystem.mycelia.js';
import { MessageSystem } from '../../../../models/message-system/message-system.v2.mycelia.js';

describe('useMemoryStorage Hook', () => {
  let messageSystem;
  let subsystem;

  beforeEach(async () => {
    messageSystem = new MessageSystem('test-ms');
    await messageSystem.bootstrap();

    subsystem = new BaseSubsystem('test-service', {
      ms: messageSystem,
      config: {
        storage: {
          capacity: 1000
        }
      }
    });

    await subsystem
      .use(useMemoryStorage)
      .build();
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
    expect(storage.supportsTransactions).toBe(false);
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
    
    const statusResult = await storage.getStatus();
    expect(statusResult.success).toBe(true);
    expect(statusResult.status.healthy).toBe(true);
    expect(statusResult.status.capacity).toBe(1000);
  });
});




