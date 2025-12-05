/**
 * Dummy Subsystem 1 for Testing
 * Handles messages with path: test1://*
 */
import { BaseSubsystem } from '../../messages/kernel/BaseSubsystem.js';

export class DummySubsystem1 extends BaseSubsystem {
  constructor(name, messageSystem, options = {}) {
    super(name, messageSystem, options);
    
    // Register a test route
    this.registerRoute('action/:type', this.handleAction.bind(this));
  }
  
  async handleAction(message, routeIterator, params) {
    return {
      success: true,
      subsystem: 'test1',
      action: params.type,
      messageId: message.getId()
    };
  }
}










