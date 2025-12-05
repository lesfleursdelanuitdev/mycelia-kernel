import { describe, it, expect } from 'vitest';

import { ServerSubsystem } from '../../models/server-subsystem/server.subsystem.mycelia.js';
import { DefaultHooks } from '../../models/defaults/default-hooks.mycelia.js';
import { useRouter } from '../../hooks/router/use-router.mycelia.js';
import { useMessages } from '../../hooks/messages/use-messages.mycelia.js';
import { SERVER_ROUTES } from '../../models/server-subsystem/server.routes.def.mycelia.js';
import { useFastifyServer } from '../../hooks/server/fastify/use-fastify-server.mycelia.js';

const HOST = '127.0.0.1';

async function createServerSubsystem() {
  // Create a mock MessageSystem with messageSystemRouter facet
  // The router will be set up to route to the subsystem's router after build
  let subsystemRouter = null;
  
  const mockRouter = {
    route: async (message, options) => {
      // Route to the subsystem's router if available
      if (subsystemRouter) {
        return await subsystemRouter.route(message, options);
      }
      // Fallback for messages routed before subsystem is built
      return { success: true, result: { success: true } };
    },
  };
  
  const mockMessageSystem = {
    name: 'test-ms',
    find: (kind) => {
      if (kind === 'messageSystemRouter') {
        return mockRouter;
      }
      return null;
    },
  };
  
  const subsystem = new ServerSubsystem('server', {
    ms: mockMessageSystem,
    config: {
      server: {
        type: 'fastify',
        host: HOST,
        port: 0,
      },
    },
  });

  // Install a minimal hook set for these integration tests
  subsystem.defaultHooks = new DefaultHooks();
  subsystem.defaultHooks.clear();
  subsystem.hooks = [];
  subsystem.use(useRouter);
  subsystem.use(useMessages);
  subsystem.use(useFastifyServer);
  expect(subsystem.hooks.map((hook) => hook.kind)).toEqual(['router', 'messages', 'server']);
  await subsystem.build();
  // onInit callbacks are executed during build(), no need to call onInit() separately
  
  // Set up the subsystem router reference for the mock MessageSystem router
  subsystemRouter = subsystem.find('router');
  
  return subsystem;
}

function getServerAddress(serverFacet) {
  const info = serverFacet?._server?.server?.address();
  if (!info || typeof info.port !== 'number') {
    throw new Error('Server is not listening');
  }
  return {
    address: info.address === '::' ? HOST : info.address,
    port: info.port,
  };
}

async function stopServer(serverFacet) {
  if (!serverFacet) return;
  try {
    await serverFacet.stop();
  } catch {
    // ignore shutdown errors to avoid masking test expectations
  }
}

describe('ServerSubsystem HTTP integration', () => {
  it('registers an HTTP route via the message workflow and serves POST requests', async () => {
    const serverSubsystem = await createServerSubsystem();
    const router = serverSubsystem.find('router');
    const messages = serverSubsystem.find('messages');
    const httpServer = serverSubsystem.find('server');

    const handledBodies = [];
    serverSubsystem.registerRoute('app://query/status', async (message) => {
      handledBodies.push(message.getBody());
      return { success: true, received: message.getBody() };
    });

    const registerMessage = messages.create(SERVER_ROUTES.registerMycelia.path, {
      myceliaPath: 'app://query/status',
      httpMethod: 'POST',
      httpPath: '/status',
    });

    const registration = await router.route(registerMessage);
    expect(registration).toEqual({
      success: true,
      registered: { myceliaPath: 'app://query/status', httpPath: '/status' },
    });

    await httpServer.start({ host: HOST, port: 0 });

    try {
      const { port } = getServerAddress(httpServer);
      const payload = { temperature: 72 };
      const response = await fetch(`http://${HOST}:${port}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ success: true, received: payload });
      expect(handledBodies).toEqual([payload]);
    } finally {
      await stopServer(httpServer);
      await serverSubsystem.dispose();
    }
  });

  it('registers multiple routes via batch message and serves HTTP GET/POST requests', async () => {
    const serverSubsystem = await createServerSubsystem();
    const router = serverSubsystem.find('router');
    const messages = serverSubsystem.find('messages');
    const httpServer = serverSubsystem.find('server');

    serverSubsystem.registerRoute('server://query/ping', async () => ({ success: true, pong: true }));
    serverSubsystem.registerRoute('app://query/info', async (message) => ({
      success: true,
      payload: message.getBody(),
    }));

    const batchMessage = messages.create(SERVER_ROUTES.registerBatch.path, {
      routes: [
        { type: 'query', queryName: 'ping', httpMethod: 'GET', httpPath: '/ping' },
        { type: 'route', myceliaPath: 'app://query/info', httpMethod: 'POST', httpPath: '/info' },
      ],
    });

    const batchRegistration = await router.route(batchMessage);
    expect(batchRegistration).toEqual({ success: true, registered: 2 });

    await httpServer.start({ host: HOST, port: 0 });

    try {
      const { port } = getServerAddress(httpServer);

      const pingResponse = await fetch(`http://${HOST}:${port}/ping`);
      expect(pingResponse.status).toBe(200);
      await expect(pingResponse.json()).resolves.toEqual({ success: true, pong: true });

      const infoPayload = { foo: 'bar' };
      const infoResponse = await fetch(`http://${HOST}:${port}/info`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(infoPayload),
      });
      expect(infoResponse.status).toBe(200);
      await expect(infoResponse.json()).resolves.toEqual({ success: true, payload: infoPayload });
    } finally {
      await stopServer(httpServer);
      await serverSubsystem.dispose();
    }
  });
});


