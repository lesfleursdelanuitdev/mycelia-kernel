/**
 * Trace ID Tests
 * 
 * Tests for distributed tracing functionality (Phase 1)
 */

import { describe, it, expect } from 'vitest';
import { Message } from '../../models/message/message.mycelia.js';
import { MessageFactory } from '../../models/message/message-factory.mycelia.js';
import { generateTraceId, inheritTraceId, extractTraceIdFromHeaders, injectTraceIdIntoHeaders } from '../../utils/trace.utils.mycelia.js';
import { createStructuredLogger, createStructuredLoggerFromMessage } from '../../utils/structured-logger.utils.mycelia.js';

describe('Trace ID Generation', () => {
  it('generates valid UUID v4 trace IDs', () => {
    const traceId = generateTraceId();
    expect(traceId).toBeDefined();
    expect(typeof traceId).toBe('string');
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates unique trace IDs', () => {
    const traceId1 = generateTraceId();
    const traceId2 = generateTraceId();
    expect(traceId1).not.toBe(traceId2);
  });
});

describe('Trace ID in Messages', () => {
  it('automatically generates trace ID for new messages', () => {
    const message = new Message('test://path', { data: 'test' });
    const traceId = message.getMeta().getTraceId();
    expect(traceId).toBeDefined();
    expect(typeof traceId).toBe('string');
    expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('allows custom trace ID in message metadata', () => {
    const customTraceId = generateTraceId();
    const message = new Message('test://path', { data: 'test' }, {
      traceId: customTraceId
    });
    const traceId = message.getMeta().getTraceId();
    expect(traceId).toBe(customTraceId);
  });

  it('inherits trace ID from parent message', () => {
    const parent = new Message('parent://test', { data: 'parent' });
    const parentTraceId = parent.getMeta().getTraceId();
    
    const child = new Message('child://test', { data: 'child' }, {
      parentMessage: parent
    });
    const childTraceId = child.getMeta().getTraceId();
    
    expect(childTraceId).toBe(parentTraceId);
  });

  it('MessageFactory generates trace IDs', () => {
    const messageData = MessageFactory.create('test://path', { data: 'test' });
    const traceId = messageData.meta.getTraceId();
    expect(traceId).toBeDefined();
    expect(typeof traceId).toBe('string');
  });
});

describe('Trace ID Inheritance', () => {
  it('inherits trace ID from parent message', () => {
    const parent = new Message('parent://test', { data: 'parent' });
    const parentTraceId = parent.getMeta().getTraceId();
    
    const inherited = inheritTraceId(parent);
    expect(inherited).toBe(parentTraceId);
  });

  it('returns null if parent message has no trace ID', () => {
    const parent = { meta: {} };
    const inherited = inheritTraceId(parent);
    expect(inherited).toBeNull();
  });

  it('returns null if no parent message', () => {
    const inherited = inheritTraceId(null);
    expect(inherited).toBeNull();
  });
});

describe('HTTP Trace ID Extraction', () => {
  it('extracts trace ID from X-Trace-Id header', () => {
    const headers = {
      'X-Trace-Id': '550e8400-e29b-41d4-a716-446655440000'
    };
    const traceId = extractTraceIdFromHeaders(headers);
    expect(traceId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('extracts trace ID from case-insensitive header', () => {
    const headers = {
      'x-trace-id': '550e8400-e29b-41d4-a716-446655440000'
    };
    const traceId = extractTraceIdFromHeaders(headers);
    expect(traceId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('extracts trace ID from W3C traceparent header', () => {
    const headers = {
      'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    };
    const traceId = extractTraceIdFromHeaders(headers);
    expect(traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('returns null if no trace ID header found', () => {
    const headers = {};
    const traceId = extractTraceIdFromHeaders(headers);
    expect(traceId).toBeNull();
  });

  it('injects trace ID into headers', () => {
    const headers = {};
    const traceId = '550e8400-e29b-41d4-a716-446655440000';
    injectTraceIdIntoHeaders(headers, traceId);
    expect(headers['X-Trace-Id']).toBe(traceId);
  });
});

describe('Structured Logging', () => {
  it('creates structured logger with JSON output', () => {
    const logger = createStructuredLogger({
      level: 'INFO',
      subsystem: 'test-subsystem',
      traceId: '550e8400-e29b-41d4-a716-446655440000',
      outputFormat: 'json'
    });
    
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('creates structured logger from message context', () => {
    const message = new Message('test://path', { data: 'test' });
    const logger = createStructuredLoggerFromMessage(message, 'test-subsystem');
    
    expect(logger).toBeDefined();
    const traceId = message.getMeta().getTraceId();
    expect(logger).toBeDefined();
    // Logger should have trace ID from message
  });

  it('outputs JSON format logs', () => {
    const logger = createStructuredLogger({
      level: 'INFO',
      subsystem: 'test',
      traceId: 'test-trace-id',
      outputFormat: 'json'
    });
    
    // Capture console.log
    const logs = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
    };
    
    logger.info('Test message', { key: 'value' });
    
    console.log = originalLog;
    
    expect(logs.length).toBeGreaterThan(0);
    const logEntry = JSON.parse(logs[0]);
    expect(logEntry.level).toBe('INFO');
    expect(logEntry.subsystem).toBe('test');
    expect(logEntry.traceId).toBe('test-trace-id');
    expect(logEntry.message).toBe('Test message');
    expect(logEntry.metadata.key).toBe('value');
  });
});





