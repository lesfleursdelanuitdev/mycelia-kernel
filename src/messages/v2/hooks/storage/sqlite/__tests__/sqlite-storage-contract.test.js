/**
 * SQLite Storage Contract Compliance Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storageContract } from '../../../../models/facet-contract/storage.contract.mycelia.js';
import { useSQLiteStorage } from '../use-sqlite-storage.mycelia.js';
import { BaseSubsystem } from '../../../../models/base-subsystem/base.subsystem.mycelia.js';
import { MessageSystem } from '../../../../models/message-system/message-system.v2.mycelia.js';
import { unlinkSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

describe('SQLite Storage Contract Compliance', () => {
  let messageSystem;
  let subsystem;
  const testDbPath = './test-data/test-contract.db';

  beforeEach(async () => {
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    
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
          dbPath: testDbPath
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

    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it('satisfies storage contract', () => {
    const storage = subsystem.find('storage');
    const ctx = {};
    const api = { name: 'test-subsystem' };

    expect(() => {
      storageContract.enforce(ctx, api, subsystem, storage);
    }).not.toThrow();
  });

  it('has all required methods', () => {
    const storage = subsystem.find('storage');
    
    expect(typeof storage.get).toBe('function');
    expect(typeof storage.set).toBe('function');
    expect(typeof storage.delete).toBe('function');
    expect(typeof storage.has).toBe('function');
    expect(typeof storage.getMany).toBe('function');
    expect(typeof storage.setMany).toBe('function');
    expect(typeof storage.deleteMany).toBe('function');
    expect(typeof storage.list).toBe('function');
    expect(typeof storage.query).toBe('function');
    expect(typeof storage.count).toBe('function');
    expect(typeof storage.createNamespace).toBe('function');
    expect(typeof storage.deleteNamespace).toBe('function');
    expect(typeof storage.listNamespaces).toBe('function');
    expect(typeof storage.getMetadata).toBe('function');
    expect(typeof storage.setMetadata).toBe('function');
    expect(typeof storage.clear).toBe('function');
    expect(typeof storage.getStatus).toBe('function');
  });

  it('has all required properties', () => {
    const storage = subsystem.find('storage');
    
    expect(storage._storageBackend).toBeDefined();
    expect(storage._config).toBeDefined();
    expect(typeof storage._storageBackend).toBe('object');
    expect(typeof storage._config).toBe('object');
  });

  it('has optional properties with correct types', () => {
    const storage = subsystem.find('storage');
    
    expect(typeof storage.supportsTransactions).toBe('boolean');
    expect(typeof storage.supportsQuery).toBe('boolean');
    expect(typeof storage.supportsMetadata).toBe('boolean');
    expect(storage.supportsTransactions).toBe(true);
    expect(storage.supportsQuery).toBe(true);
    expect(storage.supportsMetadata).toBe(true);
  });
});




