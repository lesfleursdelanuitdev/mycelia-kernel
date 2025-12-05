import { describe, it, expect, vi, beforeEach } from 'vitest';

const hoisted = vi.hoisted(() => {
  class BaseSubsystemMock {
    constructor(name, options = {}) {
      this.name = name;
      this.options = options;
      this.use = vi.fn().mockReturnThis();
      this.registerRoute = vi.fn();
      this._initCallbacks = [];
      this.onInit = vi.fn((cb) => {
        if (typeof cb === 'function') {
          this._initCallbacks.push(cb);
        }
        return this;
      });
      this.find = vi.fn((kind) => {
        if (kind === 'server') {
          return {
            registerMyceliaRoute: vi.fn().mockResolvedValue(true),
            registerMyceliaRoutes: vi.fn().mockResolvedValue(true),
            registerCommandRoute: vi.fn().mockResolvedValue(true),
          };
        }
        return null;
      });
    }
  }

  return {
    BaseSubsystemMock,
    createCanonicalDefaultHooks: vi.fn().mockReturnValue(['router']),
    useFastifyServer: vi.fn(),
    useExpressServer: vi.fn(),
  };
});

vi.mock('../../base-subsystem/base.subsystem.mycelia.js', () => ({
  BaseSubsystem: hoisted.BaseSubsystemMock,
}));

vi.mock('../../defaults/default-hooks.mycelia.js', () => ({
  createCanonicalDefaultHooks: hoisted.createCanonicalDefaultHooks,
}));

vi.mock('../../../hooks/server/fastify/use-fastify-server.mycelia.js', () => ({
  useFastifyServer: hoisted.useFastifyServer,
}));

vi.mock('../../../hooks/server/express/use-express-server.mycelia.js', () => ({
  useExpressServer: hoisted.useExpressServer,
}));

import { ServerSubsystem } from '../server.subsystem.mycelia.js';
import { SERVER_ROUTES } from '../server.routes.def.mycelia.js';

describe('ServerSubsystem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates name and installs appropriate server hook', () => {
    hoisted.useExpressServer.mockClear();
    hoisted.useFastifyServer.mockClear();
    expect(() => new ServerSubsystem('not-server', { ms: {} })).toThrow(/name must be "server"/);
    const expressInstance = new ServerSubsystem('server', { ms: {}, config: { server: { type: 'express' } } });
    expect(expressInstance.use).toHaveBeenCalledWith(hoisted.useExpressServer);
    const fastifyInstance = new ServerSubsystem('server', { ms: {}, config: { server: { type: 'fastify' } } });
    expect(fastifyInstance.use).toHaveBeenCalledWith(hoisted.useFastifyServer);
    expect(() => new ServerSubsystem('server', { ms: {}, config: { server: { type: 'unknown' } } })).toThrow(/Invalid server type/);
  });

  it('registers routes from SERVER_ROUTES during init', async () => {
    const server = new ServerSubsystem('server', { ms: {} });
    // onInit callbacks are called during build() with (api, ctx) arguments
    // We need to manually trigger the callbacks since build() is mocked
    if (server._initCallbacks && server._initCallbacks.length > 0) {
      for (const callback of server._initCallbacks) {
        await callback(server.api, server.ctx);
      }
    }
    expect(server.registerRoute).toHaveBeenCalledTimes(Object.keys(SERVER_ROUTES).length);
  });
});

