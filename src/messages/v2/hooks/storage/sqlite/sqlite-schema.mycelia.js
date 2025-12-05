/**
 * SQLite Schema Management
 * 
 * Handles database schema creation and migrations.
 */

export class SQLiteSchema {
  /**
   * Get current schema version
   * 
   * @param {import('better-sqlite3').Database} db - Database instance
   * @returns {number} Current schema version
   */
  static getCurrentVersion(db) {
    try {
      const row = db.prepare('SELECT MAX(version) as version FROM schema_version').get();
      return row?.version || 0;
    } catch (error) {
      // Table doesn't exist yet
      return 0;
    }
  }

  /**
   * Initialize schema (create tables if they don't exist)
   * 
   * @param {import('better-sqlite3').Database} db - Database instance
   */
  static initialize(db) {
    // Create schema_version table first
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `);

    // Create storage_entries table
    db.exec(`
      CREATE TABLE IF NOT EXISTS storage_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        namespace TEXT NOT NULL DEFAULT 'default',
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(namespace, key)
      )
    `);

    // Create storage_namespaces table
    db.exec(`
      CREATE TABLE IF NOT EXISTS storage_namespaces (
        name TEXT PRIMARY KEY,
        metadata TEXT,
        created_at INTEGER NOT NULL
      )
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_storage_namespace_key 
      ON storage_entries(namespace, key)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_storage_namespace 
      ON storage_entries(namespace)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_storage_created_at 
      ON storage_entries(created_at)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_storage_updated_at 
      ON storage_entries(updated_at)
    `);

    // Insert initial schema version if not exists
    const currentVersion = this.getCurrentVersion(db);
    if (currentVersion === 0) {
      db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)')
        .run(1, Date.now());
    }

    // Ensure default namespace exists
    const defaultNs = db.prepare('SELECT name FROM storage_namespaces WHERE name = ?').get('default');
    if (!defaultNs) {
      db.prepare('INSERT INTO storage_namespaces (name, created_at) VALUES (?, ?)')
        .run('default', Date.now());
    }
  }

  /**
   * Migrate database to target version
   * 
   * @param {import('better-sqlite3').Database} db - Database instance
   * @param {number} targetVersion - Target schema version
   */
  static migrate(db, targetVersion) {
    const currentVersion = this.getCurrentVersion(db);

    if (currentVersion >= targetVersion) {
      return; // Already up to date
    }

    // Run migrations in order
    for (let version = currentVersion + 1; version <= targetVersion; version++) {
      const migration = this.getMigration(version);
      if (migration) {
        db.exec(migration.up);
        db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)')
          .run(version, Date.now());
      }
    }
  }

  /**
   * Get migration for a specific version
   * 
   * @param {number} version - Schema version
   * @returns {Object|null} Migration object with 'up' and optionally 'down' methods
   */
  static getMigration(version) {
    const migrations = {
      // Version 1 is handled by initialize()
      // Future migrations go here
      // 2: {
      //   up: 'ALTER TABLE storage_entries ADD COLUMN new_field TEXT',
      //   down: 'ALTER TABLE storage_entries DROP COLUMN new_field'
      // }
    };
    return migrations[version] || null;
  }

  /**
   * Get current schema version constant
   * @returns {number} Current schema version
   */
  static getCurrentSchemaVersion() {
    return 1;
  }
}

