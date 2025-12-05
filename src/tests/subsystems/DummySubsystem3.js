/**
 * Dummy Subsystem 3 for Testing
 * Handles messages with path: test3://*
 */
import { BaseSubsystem } from '../../messages/kernel/BaseSubsystem.js';

export class DummySubsystem3 extends BaseSubsystem {
  constructor(name, messageSystem, options = {}) {
    super(name, messageSystem, options);
    
    // Register a test route
    this.registerRoute('update/:id', this.handleUpdate.bind(this));
  }
  
  async handleUpdate(message, routeIterator, params) {
    return {
      success: true,
      subsystem: 'test3',
      id: params.id,
      messageId: message.getId()
    };
  }
}










