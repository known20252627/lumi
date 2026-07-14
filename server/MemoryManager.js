const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class MemoryManager {
  constructor() {
    const dbPath = path.join(__dirname, 'lumi_memory.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database', err);
      } else {
        console.log('Connected to SQLite database.');
        this.initSchema();
      }
    });
  }

  initSchema() {
    this.db.serialize(() => {
      // Projects Table
      this.db.run(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT,
        path TEXT,
        language TEXT,
        framework TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Files Table
      this.db.run(`CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        file_path TEXT,
        content_hash TEXT,
        last_scanned DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);

      // Long-term Memory Table (Goals, Bugs, Notes)
      this.db.run(`CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        type TEXT,
        content TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);

      // Sessions Table (State saving)
      this.db.run(`CREATE TABLE IF NOT EXISTS sessions (
        project_id TEXT PRIMARY KEY,
        last_file TEXT,
        active_task TEXT,
        errors TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);
      
      // Analytics Table
      this.db.run(`CREATE TABLE IF NOT EXISTS analytics (
        project_id TEXT PRIMARY KEY,
        hours REAL DEFAULT 0,
        commits INTEGER DEFAULT 0,
        files_edited INTEGER DEFAULT 0,
        FOREIGN KEY(project_id) REFERENCES projects(id)
      )`);
    });
  }

  // --- CRUD Operations will go here ---
}

module.exports = new MemoryManager();
