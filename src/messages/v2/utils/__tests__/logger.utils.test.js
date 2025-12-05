import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger, createSubsystemLogger } from '../logger.utils.mycelia.js';

describe('logger utils', () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  });

  it('logs only when debug enabled', () => {
    const logger = createLogger(false, 'test');
    logger.log('info');
    logger.warn('warn');
    expect(console.log).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();

    const debugLogger = createLogger(true, 'test');
    debugLogger.log('info');
    debugLogger.warn('warn');
    expect(console.log).toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalled();
  });

  it('always logs errors, prefix only when debug', () => {
    const logger = createLogger(false, 'test');
    logger.error('oops');
    expect(console.error).toHaveBeenCalledWith('oops');

    const debugLogger = createLogger(true, 'test');
    debugLogger.error('oops');
    expect(console.error).toHaveBeenCalledWith('[test] ', 'oops');
  });

  it('createSubsystemLogger derives flags from subsystem', () => {
    const subsystem = { name: 'sub', debug: true };
    const logger = createSubsystemLogger(subsystem);
    logger.log('x');
    expect(console.log).toHaveBeenCalledWith('[sub] ', 'x');
  });
});

