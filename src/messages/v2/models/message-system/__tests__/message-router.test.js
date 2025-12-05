import { describe, it, expect, vi } from 'vitest';
import { MessageRouter } from '../message-router.mycelia.js';

const createMessage = ({
  path = 'svc://op',
  id = 'msg-1',
  valid = true,
  subsystem = 'svc',
  body = {},
  meta = {},
} = {}) => ({
  path,
  id,
  body,
  meta,
  hasValidSubsystem: vi.fn().mockReturnValue(valid),
  extractSubsystem: vi.fn().mockReturnValue(subsystem),
});

describe('MessageRouter', () => {
  const messageSystem = { getSubsystemCount: vi.fn().mockReturnValue(1) };
  const kernel = { accept: vi.fn(), getQueueStatus: vi.fn().mockReturnValue({ size: 0 }) };
  const registry = new Map();

  beforeEach(() => {
    registry.clear();
    vi.clearAllMocks();
  });

  it('sets kernel only once and rejects invalid paths', async () => {
    const router = new MessageRouter(messageSystem, null, registry);
    expect(router.setKernel(kernel)).toBe(true);
    expect(router.setKernel({})).toBe(false);

    const invalidMessage = createMessage({ valid: false });
    const result = await router.route(invalidMessage);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Invalid message path/);
  });

  it('routes to kernel subsystem when path is kernel://', async () => {
    const router = new MessageRouter(messageSystem, kernel, registry);
    const message = createMessage({ path: 'kernel://ping', subsystem: 'kernel' });
    kernel.accept = vi.fn().mockResolvedValue(true);
    kernel.getQueueStatus = vi.fn().mockReturnValue({ size: 0 });

    const result = await router.route(message);
    expect(result.success).toBe(true);
    expect(result.subsystem).toBe('kernel');
  });

  it('routes to registered subsystem and handles processImmediately', async () => {
    const router = new MessageRouter(messageSystem, kernel, registry);
    const subsystem = {
      name: 'svc',
      processImmediately: vi.fn().mockResolvedValue('processed'),
      accept: vi.fn(),
      getQueueStatus: vi.fn().mockReturnValue({ size: 0 }),
    };
    registry.set('svc', subsystem);
    const message = createMessage({ 
      meta: { 
        getCustomMutableField: vi.fn((field) => {
          if (field === 'processImmediately') return true;
          return undefined;
        })
      } 
    });

    const result = await router.route(message);
    expect(subsystem.processImmediately).toHaveBeenCalled();
    expect(result.result).toEqual(expect.objectContaining({ result: 'processed' }));
  });

  it('increments statistics and clears them', async () => {
    const router = new MessageRouter(messageSystem, kernel, registry);
    const message = createMessage({ subsystem: 'missing' });
    const result = await router.route(message);
    expect(result.success).toBe(false);

    const stats = router.getStatistics();
    expect(stats.unknownRoutes).toBe(1);
    router.clear();
    expect(router.stats.messagesRouted).toBe(0);
  });
});

