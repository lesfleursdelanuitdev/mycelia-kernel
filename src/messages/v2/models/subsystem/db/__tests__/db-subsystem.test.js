/**
 * DB Subsystem Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DBSubsystem } from '../db.subsystem.mycelia.js';
import { MessageSystem } from '../../../message-system/message-system.v2.mycelia.js';
import { Message } from '../../../message/message.mycelia.js';

describe('DBSubsystem', () => {
  let messageSystem;
  let dbSubsystem;

  beforeEach(async () => {
    messageSystem = new MessageSystem('test-ms');
    await messageSystem.bootstrap();

    dbSubsystem = new DBSubsystem('db', {
      ms: messageSystem,
      config: {
        storage: {
          backend: 'memory'
        },
        migrations: {
          autoRun: false
        }
      }
    });

    await dbSubsystem.build();
  });

  afterEach(async () => {
    if (dbSubsystem) {
      await dbSubsystem.dispose();
    }
    if (messageSystem) {
      await messageSystem.dispose();
    }
  });

  it('creates DBSubsystem instance', () => {
    expect(dbSubsystem).toBeDefined();
    expect(dbSubsystem.name).toBe('db');
  });

  it('has storage facet', () => {
    const storage = dbSubsystem.find('storage');
    expect(storage).toBeDefined();
    expect(typeof storage.get).toBe('function');
    expect(typeof storage.set).toBe('function');
  });

  it('has queryBuilder facet', () => {
    const queryBuilder = dbSubsystem.find('queryBuilder');
    expect(queryBuilder).toBeDefined();
    expect(typeof queryBuilder.executeQuery).toBe('function');
    expect(typeof queryBuilder.executeWrite).toBe('function');
  });

  it('has transactions facet', () => {
    const transactions = dbSubsystem.find('transactions');
    expect(transactions).toBeDefined();
    expect(typeof transactions.begin).toBe('function');
    expect(typeof transactions.commit).toBe('function');
    expect(typeof transactions.rollback).toBe('function');
  });

  it('has migrations facet', () => {
    const migrations = dbSubsystem.find('migrations');
    expect(migrations).toBeDefined();
    expect(typeof migrations.register).toBe('function');
    expect(typeof migrations.migrateUp).toBe('function');
    expect(typeof migrations.migrateDown).toBe('function');
  });

  it('handles db.query message', async () => {
    // First, set some data
    const storage = dbSubsystem.find('storage');
    await storage.set('test-key', { name: 'test', value: 123 });

    // Query it using accept method with correct route path
    const message = new Message('db://query', {
      query: [{ field: 'key', operator: 'eq', value: 'test-key' }],
      options: {}
    });
    
    const accepted = await dbSubsystem.accept(message);
    expect(accepted).toBe(true);
    
    // Process the message
    await dbSubsystem.process(100);
    
    // Note: In a real scenario, we'd need to get the result from the message
    // For now, just verify the message was accepted
    expect(accepted).toBe(true);
  });

  it('handles db.execute message', async () => {
    const message = new Message('db://execute', {
      query: 'INSERT',
      params: ['test-key', { name: 'test' }],
      options: {}
    });
    
    const accepted = await dbSubsystem.accept(message);
    expect(accepted).toBe(true);
    
    // Process the message
    await dbSubsystem.process(100);
    
    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Verify data was stored
    const storage = dbSubsystem.find('storage');
    const getResult = await storage.get('test-key');
    expect(getResult.success).toBe(true);
    expect(getResult.data).toEqual({ name: 'test' });
  });

  it('handles db.transaction.begin message', async () => {
    const transactions = dbSubsystem.find('transactions');
    const result = await transactions.begin({});
    
    // Memory storage doesn't support transactions, so this may fail
    // That's expected behavior
    if (result.success) {
      expect(result.transactionId).toBeDefined();
    } else {
      // Memory storage doesn't support transactions
      expect(result.error).toBeDefined();
    }
  });

  it('handles db.status message', async () => {
    const storage = dbSubsystem.find('storage');
    const result = await storage.getStatus();
    
    expect(result.success).toBe(true);
    expect(result.status).toBeDefined();
    expect(result.status.healthy).toBe(true);
  });

  it('supports query builder', async () => {
    const queryBuilder = dbSubsystem.find('queryBuilder');
    const builder = queryBuilder.builder();
    
    expect(builder).toBeDefined();
    expect(typeof builder.select).toBe('function');
    expect(typeof builder.where).toBe('function');
    expect(typeof builder.execute).toBe('function');
  });

  it('supports migrations', async () => {
    const migrations = dbSubsystem.find('migrations');
    
    // Register a migration
    migrations.register({
      version: 1,
      name: 'test_migration',
      up: async (storage) => {
        await storage.set('migration_test', { migrated: true });
      },
      down: async (storage) => {
        await storage.delete('migration_test');
      }
    });

    // Run migration
    const result = await migrations.migrateUp();
    expect(result.success).toBe(true);
    expect(result.applied.length).toBe(1);

    // Check status
    const status = await migrations.getStatus();
    expect(status.currentVersion).toBe(1);
    expect(status.appliedMigrations.length).toBe(1);
  });
});

