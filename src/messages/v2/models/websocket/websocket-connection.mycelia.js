/**
 * WebSocketConnection Class
 * 
 * Represents a single WebSocket connection with metadata and lifecycle management.
 * 
 * @example
 * const connection = new WebSocketConnection(socket, { userId: 'user-123' });
 * await connection.send({ message: 'Hello' });
 * connection.close(1000, 'Normal closure');
 */
export class WebSocketConnection {
  /**
   * Create a new WebSocketConnection
   * 
   * @param {WebSocket} socket - Native WebSocket instance
   * @param {Object} [options={}] - Connection options
   * @param {string} [options.id] - Connection ID (auto-generated if not provided)
   * @param {Object} [options.metadata={}] - Custom metadata
   * @param {Date} [options.connectedAt] - Connection timestamp (defaults to now)
   */
  constructor(socket, options = {}) {
    if (!socket) {
      throw new Error('WebSocketConnection: socket is required');
    }

    this.socket = socket;
    this.id = options.id || this._generateId();
    this.metadata = options.metadata || {};
    this.connectedAt = options.connectedAt || new Date();
    this.lastActivity = new Date();
    this._isClosed = false;
  }

  /**
   * Generate a unique connection ID
   * @private
   * @returns {string} Connection ID
   */
  _generateId() {
    // Use crypto.randomUUID if available, otherwise fallback
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback: timestamp + random
    return `conn-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Send data to the WebSocket client
   * 
   * @param {any} data - Data to send (will be JSON stringified if object)
   * @returns {Promise<void>}
   * @throws {Error} If connection is closed
   */
  async send(data) {
    if (this._isClosed) {
      throw new Error(`WebSocketConnection: Cannot send to closed connection ${this.id}`);
    }

    if (this.socket.readyState !== 1) { // WebSocket.OPEN
      throw new Error(`WebSocketConnection: Socket is not open (state: ${this.socket.readyState})`);
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    
    return new Promise((resolve, reject) => {
      this.socket.send(message, (error) => {
        if (error) {
          reject(error);
        } else {
          this.lastActivity = new Date();
          resolve();
        }
      });
    });
  }

  /**
   * Close the WebSocket connection
   * 
   * @param {number} [code=1000] - Close code
   * @param {string} [reason=''] - Close reason
   */
  close(code = 1000, reason = '') {
    if (this._isClosed) {
      return;
    }

    this._isClosed = true;

    if (this.socket.readyState === 1) { // WebSocket.OPEN
      this.socket.close(code, reason);
    }
  }

  /**
   * Send a ping frame (if supported)
   */
  ping() {
    if (this._isClosed || this.socket.readyState !== 1) {
      return;
    }

    if (typeof this.socket.ping === 'function') {
      this.socket.ping();
    } else if (typeof this.socket.send === 'function') {
      // Fallback: send ping message
      try {
        this.socket.send(JSON.stringify({ type: 'ping' }));
      } catch (error) {
        // Ignore errors
      }
    }
  }

  /**
   * Check if connection is closed
   * @returns {boolean} True if closed
   */
  isClosed() {
    return this._isClosed || this.socket.readyState === 3; // WebSocket.CLOSED
  }

  /**
   * Check if connection is open
   * @returns {boolean} True if open
   */
  isOpen() {
    return !this._isClosed && this.socket.readyState === 1; // WebSocket.OPEN
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = new Date();
  }

  /**
   * Get connection age in milliseconds
   * @returns {number} Age in milliseconds
   */
  getAge() {
    return Date.now() - this.connectedAt.getTime();
  }

  /**
   * Get time since last activity in milliseconds
   * @returns {number} Time since last activity
   */
  getTimeSinceLastActivity() {
    return Date.now() - this.lastActivity.getTime();
  }
}




