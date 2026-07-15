const API_URL = 'http://localhost:3001/api';

export const getProjectGitDiff = async (projectId) => {
  try {
    const res = await fetch(`${API_URL}/projects/${projectId}/git/diff`);
    if (!res.ok) throw new Error('Failed to fetch git diff');
    return await res.json();
  } catch (err) {
    console.error("Git Diff Error:", err);
    return { diff: '' };
  }
};
