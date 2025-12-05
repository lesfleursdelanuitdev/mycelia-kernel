/**
 * SQLite Prepared Statements
 * 
 * Manages and provides access to all prepared SQL statements for the SQLite storage backend.
 */

export class SQLitePreparedStatements {
  #statements;

  /**
   * Create a new SQLitePreparedStatements instance
   * 
   * @param {import('better-sqlite3').Database} db - Database instance
   */
  constructor(db) {
    this.#statements = new Map();
    this.#prepareAll(db);
  }

  /**
   * Prepare and cache all SQL statements
   * @private
   */
  #prepareAll(db) {
    this.#statements.set('get', db.prepare(
      'SELECT value, metadata FROM storage_entries WHERE namespace = ? AND key = ?'
    ));

    this.#statements.set('set', db.prepare(
      `INSERT INTO storage_entries (namespace, key, value, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(namespace, key) DO UPDATE SET
         value = excluded.value,
         metadata = excluded.metadata,
         updated_at = excluded.updated_at`
    ));

    this.#statements.set('setNoOverwrite', db.prepare(
      'INSERT INTO storage_entries (namespace, key, value, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ));

    this.#statements.set('delete', db.prepare(
      'DELETE FROM storage_entries WHERE namespace = ? AND key = ?'
    ));

    this.#statements.set('has', db.prepare(
      'SELECT 1 FROM storage_entries WHERE namespace = ? AND key = ? LIMIT 1'
    ));

    this.#statements.set('list', db.prepare(
      'SELECT key FROM storage_entries WHERE namespace = ? ORDER BY key'
    ));

    this.#statements.set('count', db.prepare(
      'SELECT COUNT(*) as count FROM storage_entries WHERE namespace = ?'
    ));

    this.#statements.set('getMetadata', db.prepare(
      'SELECT metadata FROM storage_entries WHERE namespace = ? AND key = ?'
    ));

    this.#statements.set('setMetadata', db.prepare(
      'UPDATE storage_entries SET metadata = ?, updated_at = ? WHERE namespace = ? AND key = ?'
    ));

    this.#statements.set('clearNamespace', db.prepare(
      'DELETE FROM storage_entries WHERE namespace = ?'
    ));

    this.#statements.set('clearAll', db.prepare(
      'DELETE FROM storage_entries'
    ));

    this.#statements.set('createNamespace', db.prepare(
      'INSERT INTO storage_namespaces (name, metadata, created_at) VALUES (?, ?, ?)'
    ));

    this.#statements.set('deleteNamespace', db.prepare(
      'DELETE FROM storage_namespaces WHERE name = ?'
    ));

    this.#statements.set('listNamespaces', db.prepare(
      'SELECT name FROM storage_namespaces ORDER BY name'
    ));

    this.#statements.set('namespaceExists', db.prepare(
      'SELECT 1 FROM storage_namespaces WHERE name = ? LIMIT 1'
    ));
  }

  /**
   * Get a prepared statement by name
   * 
   * @param {string} name - Statement name
   * @returns {import('better-sqlite3').Statement} Prepared statement
   */
  get(name) {
    return this.#statements.get(name);
  }

  /**
   * Check if a statement exists
   * 
   * @param {string} name - Statement name
   * @returns {boolean} True if statement exists
   */
  has(name) {
    return this.#statements.has(name);
  }
}



