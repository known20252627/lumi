const express = require('express');
const cors = require('cors');
const MemoryManager = require('./MemoryManager');
const ProjectScanner = require('./ProjectScanner');

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

app.listen(PORT, () => {
  console.log(`Lumi Local Server running on http://localhost:${PORT}`);
});
