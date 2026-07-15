// Lightweight TF-IDF based search for memory retrieval

const tokenize = (text) => {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
};

const calculateTF = (tokens) => {
  const tf = {};
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const total = tokens.length;
  Object.keys(tf).forEach(k => { tf[k] = tf[k] / total; });
  return tf;
};

export const searchMemories = (query, memories, maxResults = 5) => {
  if (!memories || memories.length === 0) return [];
  if (!query) return memories.slice(0, maxResults);

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return memories.slice(0, maxResults);

  const docs = memories.map(m => ({
    text: m,
    tokens: tokenize(m)
  }));

  // Calculate IDF
  const N = docs.length;
  const idf = {};
  
  queryTokens.forEach(t => {
    let docsWithTerm = 0;
    docs.forEach(d => {
      if (d.tokens.includes(t)) docsWithTerm++;
    });
    idf[t] = docsWithTerm > 0 ? Math.log(N / docsWithTerm) : 0;
  });

  // Calculate TF-IDF score for each document
  const scoredDocs = docs.map(doc => {
    const tf = calculateTF(doc.tokens);
    let score = 0;
    queryTokens.forEach(t => {
      score += (tf[t] || 0) * (idf[t] || 0);
    });
    return { ...doc, score };
  });

  scoredDocs.sort((a, b) => b.score - a.score);
  
  // Return top N matches, filtering out 0 scores if possible (but we can include them if nothing matches well)
  const filtered = scoredDocs.filter(d => d.score > 0);
  if (filtered.length > 0) {
    return filtered.slice(0, maxResults).map(d => d.text);
  } else {
    // Fallback: return most recent memories
    return memories.slice(-maxResults);
  }
};
