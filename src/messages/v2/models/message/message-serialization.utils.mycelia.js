/**
 * Message Serialization Utilities
 * 
 * Provides serialization and deserialization methods for messages.
 */

import { MessageMetadata } from './message-metadata.mycelia.js';
import { Message } from './message.mycelia.js';

/**
 * Serialize message to JSON
 * 
 * @param {Message} message - Message instance
 * @returns {Object} JSON representation
 */
export function toJSON(message) {
  return {
    id: message.id,
    path: message.path,
    body: message.body,
    meta: message.meta.toJSON()
  };
}

/**
 * Create message from JSON
 * 
 * @param {Object} json - JSON representation
 * @returns {Message} Message instance
 */
export function fromJSON(json) {
  // Reconstruct MessageMetadata from JSON
  const meta = json.meta && typeof json.meta === 'object' && json.meta.fixed
    ? MessageMetadata.fromJSON(json.meta)
    : new MessageMetadata(json.meta?.fixed || json.meta || {}, json.meta?.mutable || {});
  
  // Create message data object with JSON data
  const messageData = {
    id: json.id,
    path: json.path,
    body: json.body,
    meta: meta
  };
  
  return new Message(messageData);
}

/**
 * Clone the message
 * 
 * @param {Message} message - Message instance to clone
 * @returns {Message} Cloned message
 */
export function clone(message) {
  // Clone metadata
  const clonedMeta = message.meta.clone();
  
  // Create message data object with cloned metadata
  const messageData = {
    id: message.id,
    path: message.path,
    body: message.body,
    meta: clonedMeta
  };
  
  return new Message(messageData);
}

/**
 * Get string representation
 * 
 * @param {Message} message - Message instance
 * @returns {string} String representation
 */
export function toString(message) {
  return `Message(${message.id}, ${message.path}, ${JSON.stringify(message.body)})`;
}





