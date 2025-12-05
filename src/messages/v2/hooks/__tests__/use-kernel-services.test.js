import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../models/kernel-subsystem/access-control-subsystem/access-control.subsystem.mycelia.js', () => ({
  AccessControlSubsystem: vi.fn().mockImplementation(function Subsystem(name, options) {
    this.name = name;
    this.options = options;
  }),
}));

vi.mock('../../models/kernel-subsystem/error-manager-subsystem/error-manager.subsystem.mycelia.js', () => ({
  ErrorManagerSubsystem: vi.fn().mockImplementation(function Subsystem(name, options) {
    this.name = name;
    this.options = options;
  }),
}));

vi.mock('../../models/kernel-subsystem/response-manager-subsystem/response-manager.subsystem.mycelia.js', () => ({
  ResponseManagerSubsystem: vi.fn().mockImplementation(function Subsystem(name, options) {
    this.name = name;
    this.options = options;
  }),
}));

vi.mock('../../models/kernel-subsystem/channel-manager-subsystem/channel-manager.subsystem.mycelia.js', () => ({
  ChannelManagerSubsystem: vi.fn().mockImplementation(function Subsystem(name, options) {
    this.name = name;
    this.options = options;
  }),
}));

vi.mock('../../models/kernel-subsystem/profile-registry-subsystem/profile-registry.subsystem.mycelia.js', () => ({
  ProfileRegistrySubsystem: vi.fn().mockImplementation(function Subsystem(name, options) {
    this.name = name;
    this.options = options;
  }),
}));

import { useKernelServices } from '../kernel-services/use-kernel-services.mycelia.js';
import { AccessControlSubsystem } from '../../models/kernel-subsystem/access-control-subsystem/access-control.subsystem.mycelia.js';
import { ErrorManagerSubsystem } from '../../models/kernel-subsystem/error-manager-subsystem/error-manager.subsystem.mycelia.js';
import { ResponseManagerSubsystem } from '../../models/kernel-subsystem/response-manager-subsystem/response-manager.subsystem.mycelia.js';
import { ChannelManagerSubsystem } from '../../models/kernel-subsystem/channel-manager-subsystem/channel-manager.subsystem.mycelia.js';

const createSubsystem = () => {
  const hierarchy = { addChild: vi.fn() };
  const subsystem = {
    name: 'kernel',
    ms: {},
    debug: false,
    find: (kind) => (kind === 'hierarchy' ? hierarchy : null),
  };
  return { subsystem, hierarchy };
};

describe('useKernelServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires hierarchy facet', () => {
    const ctx = { config: {} };
    const api = { name: 'kernel', __facets: {} };
    const subsystem = { find: () => null };
    expect(() => useKernelServices(ctx, api, subsystem)).toThrow(/hierarchy/);
  });

  it('installs kernel child subsystems with proper configs', () => {
    const { subsystem, hierarchy } = createSubsystem();
    const ctx = {
      config: {
        kernelServices: {
          services: {
            'access-control': { custom: true },
            'error-manager': { errors: true },
          },
        },
        errorManager: { retention: 10 },
      },
    };
    const api = { name: 'kernel', __facets: {} };

    useKernelServices(ctx, api, subsystem);

    expect(AccessControlSubsystem).toHaveBeenCalledWith('access-control', expect.objectContaining({
      ms: subsystem.ms,
      config: expect.objectContaining({
        principals: { kernel: subsystem },
        custom: true,
      }),
    }));
    expect(ErrorManagerSubsystem).toHaveBeenCalled();
    expect(ResponseManagerSubsystem).toHaveBeenCalled();
    expect(ChannelManagerSubsystem).toHaveBeenCalled();
    expect(hierarchy.addChild).toHaveBeenCalledTimes(5); // 4 original + ProfileRegistrySubsystem
  });
});

