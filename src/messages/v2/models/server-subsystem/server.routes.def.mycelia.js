/**
 * Server Route Definitions
 * 
 * Defines the route paths used by ServerSubsystem to handle route registration messages.
 * These routes are registered internally by ServerSubsystem and handle incoming messages
 * from other subsystems that want to register HTTP routes.
 */

export const SERVER_ROUTES = {
  'registerMycelia': {
    path: 'server://route/register-mycelia',
    description: 'Register a Mycelia route as HTTP endpoint',
    metadata: {
      type: 'route',
      purpose: 'route-registration'
    },
    extractData: (body) => ({ myceliaPath: body.myceliaPath, httpMethod: body.httpMethod, httpPath: body.httpPath, options: body.options }),
    serverMethod: 'registerMyceliaRoute',
    buildResponse: (data) => ({ myceliaPath: data.myceliaPath, httpPath: data.httpPath })
  },
  'registerCommand': {
    path: 'server://route/register-command',
    description: 'Register a Mycelia command as HTTP endpoint',
    metadata: {
      type: 'route',
      purpose: 'route-registration'
    },
    extractData: (body) => ({ commandName: body.commandName, httpMethod: body.httpMethod, httpPath: body.httpPath, options: body.options }),
    serverMethod: 'registerMyceliaCommand',
    buildResponse: (data) => ({ commandName: data.commandName, httpPath: data.httpPath })
  },
  'registerQuery': {
    path: 'server://route/register-query',
    description: 'Register a Mycelia query as HTTP endpoint',
    metadata: {
      type: 'route',
      purpose: 'route-registration'
    },
    extractData: (body) => ({ queryName: body.queryName, httpMethod: body.httpMethod, httpPath: body.httpPath, options: body.options }),
    serverMethod: 'registerMyceliaQuery',
    buildResponse: (data) => ({ queryName: data.queryName, httpPath: data.httpPath })
  },
  'registerBatch': {
    path: 'server://route/register-batch',
    description: 'Batch register multiple Mycelia routes/commands/queries as HTTP endpoints',
    metadata: {
      type: 'route',
      purpose: 'route-registration'
    },
    extractData: (body) => ({ routes: body.routes }),
    serverMethod: 'registerMyceliaRoutes',
    buildResponse: (data) => data.routes.length,
    validate: (data) => {
      if (!Array.isArray(data.routes)) {
        return { success: false, error: 'routes must be an array' };
      }
      return null;
    }
  }
};
