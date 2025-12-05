import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockBuilderInstance = () => ({
  stub: true,
});

vi.mock('../requests/request-builder.mycelia.js', () => {
  const RequestBuilder = vi.fn().mockImplementation(() => mockBuilderInstance());
  return { RequestBuilder };
});

vi.mock('../requests/command-manager.mycelia.js', () => {
  const CommandManager = vi.fn().mockImplementation((subsystem) => ({
    subsystem,
    sendCommand: vi.fn(),
  }));
  return { CommandManager };
});

vi.mock('../requests/request-core.mycelia.js', () => ({
  performRequest: vi.fn(),
}));

import { useRequests } from '../requests/use-requests.mycelia.js';
import { RequestBuilder } from '../requests/request-builder.mycelia.js';
import { CommandManager } from '../requests/command-manager.mycelia.js';
import { performRequest } from '../requests/request-core.mycelia.js';

const createRequestsFacet = () => {
  const api = {
    name: 'canvas',
    __facets: { router: {} },
  };
  const subsystem = { name: 'canvas', identity: { sendProtected: vi.fn() } };
  const ctx = { config: { requests: { debug: false } } };
  const facet = useRequests(ctx, api, subsystem);
  return { facet, api, subsystem };
};

describe('useRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes CommandManager with the subsystem', () => {
    const { subsystem } = createRequestsFacet();
    expect(CommandManager).toHaveBeenCalledWith(subsystem);
  });

  it('creates RequestBuilder for oneShot requests', () => {
    const { facet, subsystem } = createRequestsFacet();
    const builder = facet.oneShot();
    expect(builder.stub).toBe(true);
    expect(RequestBuilder).toHaveBeenCalledWith({
      type: 'oneShot',
      subsystem,
      performRequest,
      commandManager: expect.any(Object),
    });
  });

  it('creates RequestBuilder for command requests', () => {
    const { facet, subsystem } = createRequestsFacet();
    const builder = facet.command();
    expect(builder.stub).toBe(true);
    expect(RequestBuilder).toHaveBeenCalledWith({
      type: 'command',
      subsystem,
      performRequest,
      commandManager: expect.any(Object),
    });
  });

  it('exposes the shared CommandManager instance', () => {
    const { facet, subsystem } = createRequestsFacet();
    const manager = facet.commandManager;
    expect(manager.subsystem).toBe(subsystem);
  });
});

