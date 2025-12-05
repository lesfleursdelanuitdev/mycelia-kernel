/**
 * Dummy Subsystem 4 for Testing
 * Handles messages with path: test4://*
 */
import { BaseSubsystem } from '../../messages/kernel/BaseSubsystem.js';

export class DummySubsystem4 extends BaseSubsystem {
  constructor(name, messageSystem, options = {}) {
    super(name, messageSystem, options);
    
    // Register a test route
    this.registerRoute('create/:resource', this.handleCreate.bind(this));
  }
  
  async handleCreate(message, routeIterator, params) {
    return {
      success: true,
      subsystem: 'test4',
      resource: params.resource,
      messageId: message.getId()
    };
  }
}










