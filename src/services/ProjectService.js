const API_URL = 'http://localhost:3001/api';

export const getProjects = async () => {
  try {
    const res = await fetch(`${API_URL}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return await res.json();
  } catch (err) {
    console.error("Local Node Server is not running or accessible.", err);
    return [];
  }
};

export const importProject = async (projectPath, name = "") => {
  try {
    const res = await fetch(`${API_URL}/projects/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: projectPath, name })
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to import project');
    }
    
    return await res.json();
  } catch (err) {
    console.error("Import Error:", err);
    throw err;
  }
};

export const getProjectFiles = async (projectId, filePaths) => {
  try {
    const res = await fetch(`${API_URL}/projects/${projectId}/files`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePaths })
    });
    if (!res.ok) throw new Error('Failed to fetch project files');
    return await res.json();
  } catch (err) {
    console.error("File Fetch Error:", err);
    return {};
  }
};

export const getProjectScan = async (projectId) => {
  try {
    const res = await fetch(`${API_URL}/projects/${projectId}/scan`);
    if (!res.ok) throw new Error('Failed to fetch project scan');
    return await res.json();
  } catch (err) {
    console.error("Scan Error:", err);
    return null;
  }
};


