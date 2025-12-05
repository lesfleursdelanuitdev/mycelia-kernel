import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useResponses } from '../responses/use-responses.mycelia.js';

const createMessage = (overrides = {}) => ({
  id: overrides.id ?? 'req-1',
  body: overrides.body ?? {},
  meta: overrides.meta ?? {
    getCustomField: vi.fn(),
    getCustomMutableField: vi.fn(),
  },
  getId: overrides.getId,
});

const createMessagesFacet = () => ({
  create: vi.fn().mockImplementation((path, payload, options) => ({
    id: 'msg-response',
    path,
    body: payload ? { ...payload } : {},
    meta: options,
  })),
});

const createIdentity = () => ({
  sendProtected: vi.fn().mockResolvedValue('sent'),
});

const createSubsystem = (identityOverrides = {}) => {
  const identity = { ...createIdentity(), ...identityOverrides };
  return {
    name: 'canvas',
    identity,
    find: vi.fn((kind) => {
      // Return null by default, tests can override via subsystemOverrides
      return null;
    }),
    getRoot: () => ({
      getResponseManager: () => ({
        getReplyTo: vi.fn().mockReturnValue('canvas://channel/replies'),
      }),
    }),
  };
};

const createResponsesFacet = (overrides = {}) => {
  const messagesFacet = overrides.messagesFacet || createMessagesFacet();
  const subsystem = overrides.subsystem || createSubsystem();
  
  // Ensure subsystem.find() returns messagesFacet
  if (!subsystem.find || subsystem.find.mockImplementation === undefined) {
    subsystem.find = vi.fn((kind) => {
      if (kind === 'messages') return messagesFacet;
      return null;
    });
  } else {
    // If find is already a mock, update it to return messagesFacet
    subsystem.find.mockImplementation((kind) => {
      if (kind === 'messages') return messagesFacet;
      return null;
    });
  }
  
  const api = {
    name: 'canvas',
    __facets: {
      messages: messagesFacet,
    },
  };
  const ctx = { config: { responses: overrides.config || {} } };
  const facet = useResponses(ctx, api, subsystem);
  return { facet, messagesFacet, subsystem };
};

describe('useResponses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires messages facet and identity sendProtected', async () => {
    const subsystemNoMessages = createSubsystem();
    subsystemNoMessages.find = vi.fn(() => null); // find() returns null (no messages facet)
    expect(() => useResponses({}, { name: 'canvas', __facets: {} }, subsystemNoMessages)).toThrow(/messages facet is required/i);
    
    // Identity validation happens lazily when methods are called, not during hook execution
    // So we test it by actually calling a method
    const messagesFacet = createMessagesFacet();
    const badSubsystem = createSubsystem();
    badSubsystem.find = vi.fn((kind) => {
      if (kind === 'messages') return messagesFacet;
      return null;
    });
    badSubsystem.identity = {}; // No sendProtected method
    
    // Hook should not throw during initialization
    const facet = useResponses({}, { name: 'canvas', __facets: { messages: messagesFacet } }, badSubsystem);
    
    // But calling a method should throw
    await expect(facet.sendResponse({
      path: 'canvas://test',
      inReplyTo: 'req-1',
      payload: {},
    })).rejects.toThrow(/sendProtected/);
  });

  it('sendResponse sends via identity with correlation metadata', async () => {
    const { facet, messagesFacet, subsystem } = createResponsesFacet();
    await facet.sendResponse({
      path: 'canvas://channel/replies',
      inReplyTo: 'req-1',
      payload: { ok: true },
      success: true,
      options: { headers: { foo: 'bar' } },
    });

    expect(messagesFacet.create).toHaveBeenCalledWith(
      'canvas://channel/replies',
      { ok: true },
      {
        meta: {
          inReplyTo: 'req-1',
          correlationId: 'req-1',
        },
      },
    );
    expect(subsystem.identity.sendProtected).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'canvas://channel/replies' }),
      expect.objectContaining({
        isResponse: true,
        success: true,
        error: undefined,
      }),
    );
  });

  it('replyTo infers correlation id and reply path from response manager', async () => {
    const { facet, subsystem } = createResponsesFacet();
    const original = createMessage({
      getId: () => 'req-42',
    });

    await facet.replyTo(original, { answer: 1 });

    expect(subsystem.identity.sendProtected).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'canvas://channel/replies' }),
      expect.objectContaining({ success: true }),
    );
  });

  it('replyTo throws if it cannot derive reply path', async () => {
    const subsystem = createSubsystem();
    subsystem.getRoot = () => ({ getResponseManager: () => null });
    const { facet } = createResponsesFacet({
      subsystem,
      config: {},
    });

    const original = createMessage({
      id: 'req-99',
      meta: {
        getCustomField: vi.fn().mockReturnValue(null),
        getCustomMutableField: vi.fn().mockReturnValue(null),
      },
    });

    await expect(facet.replyTo(original, {})).rejects.toThrow(/replyPath is required/);
  });

  it('replyErrorTo sends failure responses with error payload', async () => {
    const subsystem = createSubsystem();
    subsystem.getRoot = () => ({ getResponseManager: () => null });
    const { facet } = createResponsesFacet({
      subsystem,
      config: { defaultReplyPath: 'canvas://channel/errors' },
    });
    const original = createMessage({ id: 'req-13' });

    await facet.replyErrorTo(original, { code: 'ERR' });

    expect(subsystem.identity.sendProtected).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'canvas://channel/errors' }),
      expect.objectContaining({ success: false, error: { code: 'ERR' } }),
    );
  });
});

