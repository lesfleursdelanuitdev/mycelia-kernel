import { describe, it, expect } from 'vitest';
import { SERVER_ROUTES } from '../server.routes.def.mycelia.js';

describe('SERVER_ROUTES', () => {
  it('extracts data for route registration', () => {
    const body = {
      myceliaPath: 'svc://op',
      httpMethod: 'POST',
      httpPath: '/op',
      options: { auth: true },
    };
    expect(SERVER_ROUTES.registerMycelia.extractData(body)).toEqual(body);
    expect(SERVER_ROUTES.registerCommand.extractData({ commandName: 'cmd', ...body })).toHaveProperty('commandName', 'cmd');
    expect(SERVER_ROUTES.registerQuery.extractData({ queryName: 'qry', ...body })).toHaveProperty('queryName', 'qry');
  });

  it('builds responses for various routes', () => {
    const data = { myceliaPath: 'svc://op', httpPath: '/op', commandName: 'cmd', queryName: 'qry', routes: [{}, {}] };
    expect(SERVER_ROUTES.registerMycelia.buildResponse(data)).toEqual({ myceliaPath: 'svc://op', httpPath: '/op' });
    expect(SERVER_ROUTES.registerCommand.buildResponse(data)).toEqual({ commandName: 'cmd', httpPath: '/op' });
    expect(SERVER_ROUTES.registerQuery.buildResponse(data)).toEqual({ queryName: 'qry', httpPath: '/op' });
    expect(SERVER_ROUTES.registerBatch.buildResponse({ routes: [{}, {}] })).toBe(2);
  });

  it('validates batch registrations', () => {
    expect(SERVER_ROUTES.registerBatch.validate({ routes: [] })).toBeNull();
    expect(SERVER_ROUTES.registerBatch.validate({ routes: 'bad' })).toEqual({ success: false, error: 'routes must be an array' });
  });
});

