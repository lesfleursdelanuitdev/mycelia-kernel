/**
 * Dummy Subsystem 5 for Testing
 * Handles messages with path: test5://*
 */
import { BaseSubsystem } from '../../messages/kernel/BaseSubsystem.js';

export class DummySubsystem5 extends BaseSubsystem {
  constructor(name, messageSystem, options = {}) {
    super(name, messageSystem, options);
    
    // Register a test route
    this.registerRoute('delete/:target', this.handleDelete.bind(this));
  }
  
  async handleDelete(message, routeIterator, params) {
    return {
      success: true,
      subsystem: 'test5',
      target: params.target,
      messageId: message.getId()
    };
  }
}










