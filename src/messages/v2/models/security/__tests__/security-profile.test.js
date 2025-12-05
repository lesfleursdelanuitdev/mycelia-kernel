import { describe, it, expect } from 'vitest';
import { SecurityProfile } from '../security-profile.mycelia.js';

describe('SecurityProfile', () => {
  describe('constructor', () => {
    it('creates a profile with valid name and grants', () => {
      const grants = {
        'canvas://graph/res.type.scene.name.a': 'rw',
        'canvas://graph/res.type.scene.name.b': 'r'
      };
      const profile = new SecurityProfile('admin', grants);
      
      expect(profile.getName()).toBe('admin');
      expect(profile.getGrantsAsObject()).toEqual(grants);
      expect(profile.getUuid()).toBeDefined();
      expect(profile.getCreatedAt()).toBeGreaterThan(0);
    });

    it('creates a profile with Map grants', () => {
      const grants = new Map([
        ['resource1', 'r'],
        ['resource2', 'rw']
      ]);
      const profile = new SecurityProfile('user', grants);
      
      expect(profile.getGrantsAsObject()).toEqual({
        resource1: 'r',
        resource2: 'rw'
      });
    });

    it('creates a profile with metadata', () => {
      const metadata = { description: 'Admin profile', tier: 'high' };
      const profile = new SecurityProfile('admin', {}, metadata);
      
      expect(profile.getMetadata()).toEqual(metadata);
    });

    it('throws error for empty name', () => {
      expect(() => {
        new SecurityProfile('', {});
      }).toThrow('name must be a non-empty string');
    });

    it('throws error for non-string name', () => {
      expect(() => {
        new SecurityProfile(123, {});
      }).toThrow('name must be a non-empty string');
    });

    it('throws error for invalid permission', () => {
      expect(() => {
        new SecurityProfile('admin', { 'resource1': 'invalid' });
      }).toThrow('invalid permission');
    });

    it('throws error for non-object grants', () => {
      expect(() => {
        new SecurityProfile('admin', 'not-an-object');
      }).toThrow('grants must be an object or Map');
    });

    it('trims profile name', () => {
      const profile = new SecurityProfile('  admin  ', {});
      expect(profile.getName()).toBe('admin');
    });
  });

  describe('getPermission', () => {
    it('returns permission for existing resource', () => {
      const profile = new SecurityProfile('admin', {
        'resource1': 'rw',
        'resource2': 'r'
      });
      
      expect(profile.getPermission('resource1')).toBe('rw');
      expect(profile.getPermission('resource2')).toBe('r');
    });

    it('returns undefined for non-existent resource', () => {
      const profile = new SecurityProfile('admin', {});
      expect(profile.getPermission('nonexistent')).toBeUndefined();
    });
  });

  describe('hasGrant', () => {
    it('returns true for existing grant', () => {
      const profile = new SecurityProfile('admin', { 'resource1': 'rw' });
      expect(profile.hasGrant('resource1')).toBe(true);
    });

    it('returns false for non-existent grant', () => {
      const profile = new SecurityProfile('admin', {});
      expect(profile.hasGrant('nonexistent')).toBe(false);
    });
  });

  describe('addGrant', () => {
    it('adds a new grant', () => {
      const profile = new SecurityProfile('admin', {});
      const originalUpdatedAt = profile.getUpdatedAt();
      profile.addGrant('scope1', 'rw');
      
      expect(profile.getPermission('scope1')).toBe('rw');
      expect(profile.getUpdatedAt()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('updates an existing grant', () => {
      const profile = new SecurityProfile('admin', { 'scope1': 'r' });
      profile.addGrant('scope1', 'rw');
      
      expect(profile.getPermission('scope1')).toBe('rw');
    });

    it('throws error for invalid permission', () => {
      const profile = new SecurityProfile('admin', {});
      expect(() => {
        profile.addGrant('scope1', 'invalid');
      }).toThrow('invalid permission');
    });
  });

  describe('removeGrant', () => {
    it('removes an existing grant', () => {
      const profile = new SecurityProfile('admin', { 'scope1': 'rw' });
      const originalUpdatedAt = profile.getUpdatedAt();
      const removed = profile.removeGrant('scope1');
      
      expect(removed).toBe(true);
      expect(profile.hasGrant('scope1')).toBe(false);
      expect(profile.getUpdatedAt()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });

    it('returns false for non-existent grant', () => {
      const profile = new SecurityProfile('admin', {});
      const removed = profile.removeGrant('nonexistent');
      
      expect(removed).toBe(false);
    });
  });

  describe('updateMetadata', () => {
    it('updates metadata', () => {
      const profile = new SecurityProfile('admin', {}, { description: 'Original' });
      const originalUpdatedAt = profile.getUpdatedAt();
      profile.updateMetadata({ description: 'Updated', tier: 'high' });
      
      expect(profile.getMetadata()).toEqual({
        description: 'Updated',
        tier: 'high'
      });
      expect(profile.getUpdatedAt()).toBeGreaterThanOrEqual(originalUpdatedAt);
    });
  });

  describe('updateGrants', () => {
    it('updates grants in-place preserving UUID', () => {
      const profile = new SecurityProfile('admin', { 'scope1': 'r' });
      const originalUuid = profile.getUuid();
      const originalCreatedAt = profile.getCreatedAt();
      
      profile.updateGrants({ 'scope1': 'rw', 'scope2': 'r' }, false);
      
      expect(profile.getUuid()).toBe(originalUuid);
      expect(profile.getCreatedAt()).toBe(originalCreatedAt);
      expect(profile.getPermission('scope1')).toBe('rw');
      expect(profile.getPermission('scope2')).toBe('r');
      expect(profile.getUpdatedAt()).toBeGreaterThanOrEqual(originalCreatedAt);
    });

    it('replaces all grants when replace=true', () => {
      const profile = new SecurityProfile('admin', { 'scope1': 'r', 'scope2': 'rw' });
      const originalUuid = profile.getUuid();
      
      profile.updateGrants({ 'scope3': 'rwg' }, true);
      
      expect(profile.getUuid()).toBe(originalUuid);
      expect(profile.hasGrant('scope1')).toBe(false);
      expect(profile.hasGrant('scope2')).toBe(false);
      expect(profile.getPermission('scope3')).toBe('rwg');
    });
  });

  describe('toJSON', () => {
    it('serializes profile to JSON', () => {
      const grants = { 'resource1': 'rw' };
      const metadata = { description: 'Admin' };
      const profile = new SecurityProfile('admin', grants, metadata);
      const json = profile.toJSON();
      
      expect(json.name).toBe('admin');
      expect(json.grants).toEqual(grants);
      expect(json.metadata).toEqual(metadata);
      expect(json.uuid).toBe(profile.getUuid());
      expect(json.createdAt).toBe(profile.getCreatedAt());
      expect(json.updatedAt).toBe(profile.getUpdatedAt());
    });
  });

  describe('fromJSON', () => {
    it('creates profile from JSON', () => {
      const json = {
        name: 'admin',
        uuid: 'test-uuid',
        grants: { 'resource1': 'rw' },
        metadata: { description: 'Admin' },
        createdAt: 1000,
        updatedAt: 2000
      };
      
      const profile = SecurityProfile.fromJSON(json);
      
      expect(profile.getName()).toBe('admin');
      expect(profile.getUuid()).toBe('test-uuid');
      expect(profile.getGrantsAsObject()).toEqual({ 'resource1': 'rw' });
      expect(profile.getMetadata()).toEqual({ description: 'Admin' });
      expect(profile.getCreatedAt()).toBe(1000);
      expect(profile.getUpdatedAt()).toBe(2000);
    });
  });

  describe('clone', () => {
    it('creates an independent copy', () => {
      const profile = new SecurityProfile('admin', { 'resource1': 'rw' });
      const cloned = profile.clone();
      
      expect(cloned.getName()).toBe(profile.getName());
      expect(cloned.getGrantsAsObject()).toEqual(profile.getGrantsAsObject());
      expect(cloned.getUuid()).not.toBe(profile.getUuid());
      
      cloned.addGrant('resource2', 'r');
      expect(profile.hasGrant('resource2')).toBe(false);
    });
  });

  describe('permission levels', () => {
    it('accepts all valid permission levels', () => {
      const profile = new SecurityProfile('admin', {
        'resource1': 'r',
        'resource2': 'rw',
        'resource3': 'rwg'
      });
      
      expect(profile.getPermission('resource1')).toBe('r');
      expect(profile.getPermission('resource2')).toBe('rw');
      expect(profile.getPermission('resource3')).toBe('rwg');
    });
  });
});

