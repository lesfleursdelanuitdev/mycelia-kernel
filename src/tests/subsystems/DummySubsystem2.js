/**
 * Dummy Subsystem 2 for Testing
 * Handles messages with path: test2://*
 */
import { BaseSubsystem } from '../../messages/kernel/BaseSubsystem.js';

export class DummySubsystem2 extends BaseSubsystem {
  constructor(name, messageSystem, options = {}) {
    super(name, messageSystem, options);
    
    // Register a test route
    this.registerRoute('process/:item', this.handleProcess.bind(this));
  }
  
  async handleProcess(message, routeIterator, params) {
    return {
      success: true,
      subsystem: 'test2',
      item: params.item,
      messageId: message.getId()
    };
  }
}










