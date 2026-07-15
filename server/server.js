const express = require('express');
const cors = require('cors');
const MemoryManager = require('./MemoryManager');
const ProjectScanner = require('./ProjectScanner');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lumi Project Memory Server is running' });
});

// API: Get all projects
app.get('/api/projects', (req, res) => {
  MemoryManager.db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: Import a new project
app.post('/api/projects/import', async (req, res) => {
  const { path: projectPath, name } = req.body;
  
  if (!projectPath) {
    return res.status(400).json({ error: 'Project path is required' });
  }

  try {
    const id = Buffer.from(projectPath).toString('base64');
    
    // Scan project to get metadata
    const scanData = await ProjectScanner.scanProject(projectPath);
    
    MemoryManager.db.run(
      'INSERT OR REPLACE INTO projects (id, name, path, language, framework) VALUES (?, ?, ?, ?, ?)',
      [id, name || path.basename(projectPath), projectPath, scanData.language, scanData.framework],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
          success: true, 
          id, 
          message: 'Project imported and scanned successfully',
          metadata: scanData
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get specific files from a project
app.post('/api/projects/:id/files', (req, res) => {
  const { id } = req.params;
  const { filePaths } = req.body; // Array of relative paths
  
  if (!filePaths || !Array.isArray(filePaths)) {
    return res.status(400).json({ error: 'filePaths array is required' });
  }

  MemoryManager.db.get('SELECT path FROM projects WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Project not found' });

    const results = {};
    for (const relPath of filePaths) {
      const fullPath = path.join(row.path, relPath);
      // Security check to prevent path traversal
      if (fullPath.startsWith(row.path) && fs.existsSync(fullPath)) {
        try {
          results[relPath] = fs.readFileSync(fullPath, 'utf8');
        } catch (e) {
          results[relPath] = `Error reading file: ${e.message}`;
        }
      } else {
        results[relPath] = null; // not found
      }
    }
    res.json(results);
  });
});

// API: Get Git diff for a project
app.get('/api/projects/:id/git/diff', (req, res) => {
  const { id } = req.params;
  
  MemoryManager.db.get('SELECT path FROM projects WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Project not found' });

    // Run git diff
    exec('git diff', { cwd: row.path, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      // If error (e.g. not a git repo), it might return an error, but let's handle it
      if (error && error.code !== 0 && !stdout) {
        return res.status(500).json({ error: stderr || error.message });
      }
      res.json({ diff: stdout });
    });
  });
});

// API: Get full project metadata (scan on the fly)
app.get('/api/projects/:id/scan', (req, res) => {
  const { id } = req.params;
  
  MemoryManager.db.get('SELECT path FROM projects WHERE id = ?', [id], async (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Project not found' });

    try {
      const scanData = await ProjectScanner.scanProject(row.path);
      res.json(scanData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

app.listen(PORT, () => {
  console.log(`Lumi Local Server running on http://localhost:${PORT}`);
});
