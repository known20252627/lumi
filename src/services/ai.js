import * as webllm from '@mlc-ai/web-llm';

export const generateAIResponse = async (messages, progressCallback = null, selectedProvider = 'cascade', systemPrompt = "You are Lumi, a highly expert AI mentor.") => {
  const keys = {
    openai: (localStorage.getItem('lumi_openai_key') || '').trim(),
    gemini: (localStorage.getItem('lumi_api_key') || '').trim(),
    groq: (localStorage.getItem('lumi_groq_key') || '').trim(),
    cerebras: (localStorage.getItem('lumi_cerebras_key') || '').trim(),
    sarvam: (localStorage.getItem('lumi_sarvam_key') || '').trim()
  };

  // If a specific provider is requested, only try that one.
  if (selectedProvider === 'openai' && keys.openai) return await fetchOpenAI(messages, keys.openai, systemPrompt);
  if (selectedProvider === 'gemini' && keys.gemini) return await fetchGemini(messages, keys.gemini, systemPrompt);
  if (selectedProvider === 'groq' && keys.groq) return await fetchGroq(messages, keys.groq, systemPrompt);
  if (selectedProvider === 'cerebras' && keys.cerebras) return await fetchCerebras(messages, keys.cerebras, systemPrompt);
  if (selectedProvider === 'sarvam' && keys.sarvam) return await fetchSarvam(messages, keys.sarvam, systemPrompt);
  if (selectedProvider === 'local') return await runLocalWebLLM(messages, progressCallback, systemPrompt);

  // Otherwise, run the Cascade
  if (keys.openai) {
    try { return await fetchOpenAI(messages, keys.openai, systemPrompt); } catch (e) { console.warn("OpenAI Failed", e); }
  }
  if (keys.cerebras) {
    try { return await fetchCerebras(messages, keys.cerebras, systemPrompt); } catch (e) { console.warn("Cerebras Failed", e); }
  }
  if (keys.gemini) {
    try { return await fetchGemini(messages, keys.gemini, systemPrompt); } catch (e) { console.warn("Gemini Failed", e); }
  }
  if (keys.groq) {
    try { return await fetchGroq(messages, keys.groq, systemPrompt); } catch (e) { console.warn("Groq Failed", e); }
  }
  if (keys.sarvam) {
    try { return await fetchSarvam(messages, keys.sarvam, systemPrompt); } catch (e) { console.warn("Sarvam Failed", e); }
  }

  // Fallback
  return await runLocalWebLLM(messages, progressCallback, systemPrompt);
};

const recordUsage = (provider, tokens) => {
  if (!tokens) return;
  try {
    const raw = localStorage.getItem('lumi_usage_stats');
    const stats = raw ? JSON.parse(raw) : { openai: 0, gemini: 0, groq: 0, cerebras: 0, sarvam: 0, local: 0 };
    stats[provider] = (stats[provider] || 0) + tokens;
    localStorage.setItem('lumi_usage_stats', JSON.stringify(stats));
    window.dispatchEvent(new Event('lumi_usage_updated'));
  } catch (e) {
    console.error("Failed to record usage", e);
  }
};

const fetchOpenAI = async (messages, apiKey, systemPrompt) => {
  const formatted = [{ role: 'system', content: systemPrompt }, ...messages];
  const response = await fetch("/api/openai/v1/chat/completions", {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "gpt-4o", messages: formatted, temperature: 0.7 })
  });
  if (!response.ok) {
    const err = await response.json().catch(()=>({}));
    throw new Error(err.error?.message || "OpenAI API Error");
  }
  const data = await response.json();
  recordUsage('openai', data.usage?.total_tokens);
  return data.choices[0].message.content;
};

const fetchCerebras = async (messages, apiKey, systemPrompt) => {
  const formatted = [{ role: 'system', content: systemPrompt }, ...messages];
  const response = await fetch("/api/cerebras/v1/chat/completions", {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "llama3.1-8b", messages: formatted, temperature: 0.7 })
  });
  if (!response.ok) {
    const err = await response.json().catch(()=>({}));
    throw new Error(err.error?.message || "Cerebras API Error");
  }
  const data = await response.json();
  recordUsage('cerebras', data.usage?.total_tokens);
  return data.choices[0].message.content;
};

const fetchGemini = async (messages, apiKey, systemPrompt) => {
  const formatted = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: formatted, systemInstruction: { role: 'user', parts: [{ text: systemPrompt }] } })
  });
  if (!response.ok) {
    const err = await response.json().catch(()=>({}));
    throw new Error(err.error?.message || "Gemini API Error");
  }
  const data = await response.json();
  recordUsage('gemini', data.usageMetadata?.totalTokenCount);
  return data.candidates[0].content.parts[0].text;
};

const fetchGroq = async (messages, apiKey, systemPrompt) => {
  const formatted = [{ role: 'system', content: systemPrompt }, ...messages];
  const response = await fetch("/api/groq/openai/v1/chat/completions", {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: formatted, temperature: 0.7 })
  });
  if (!response.ok) {
    const err = await response.json().catch(()=>({}));
    throw new Error(err.error?.message || "Groq API Error");
  }
  const data = await response.json();
  recordUsage('groq', data.usage?.total_tokens);
  return data.choices[0].message.content;
};

const fetchSarvam = async (messages, apiKey, systemPrompt) => {
  const formatted = [{ role: 'system', content: systemPrompt }, ...messages];
  const response = await fetch("/api/sarvam/v1/chat/completions", {
    method: 'POST',
    headers: { 'api-subscription-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: "sarvam-2b-v0.5", messages: formatted, temperature: 0.7 })
  });
  if (!response.ok) {
    const err = await response.json().catch(()=>({}));
    throw new Error(err.message || "Sarvam API Error");
  }
  const data = await response.json();
  recordUsage('sarvam', data.usage?.total_tokens);
  return data.choices[0].message.content;
};

// --- LOCAL WEBLLM ---

let localEngine = null;

const runLocalWebLLM = async (messages, progressCallback, systemPrompt) => {
  try {
    if (!localEngine) {
      if (progressCallback) progressCallback("Initializing Local Engine...");
      const selectedModel = "Phi-3-mini-4k-instruct-q4f16_1-MLC";
      localEngine = await webllm.CreateMLCEngine(selectedModel, {
        initProgressCallback: (progress) => {
          if (progressCallback) {
            progressCallback(`Downloading Local Model... ${Math.round(progress.progress * 100)}%`);
          }
        }
      });
    }

    if (progressCallback) progressCallback("Running Locally...");
    
    const formatted = [{ role: 'system', content: systemPrompt }, ...messages];
    const reply = await localEngine.chat.completions.create({ messages: formatted });
    
    if (progressCallback) progressCallback(""); 
    recordUsage('local', reply.usage?.total_tokens);
    return reply.choices[0].message.content;
  } catch (e) {
    if (e.message.includes("valid external Instance reference no longer exists")) {
      throw new Error("WebGPU Context Crashed (Common during development). Please press F5 to refresh the page and try again.");
    }
    throw e;
  }
};

// --- MEMORY EXTRACTOR ---
export const extractPersonalMemory = async (userMessage) => {
  const prompt = `You are an internal Memory Extraction AI.
Your ONLY job is to extract permanent facts about the user from their message.
If the user mentions their name, where they live, what they like/dislike, their tech stack, or any personal detail, you MUST extract it as a short bullet point.
If the user says "My name is X", you MUST extract "User's name is X".

If there are NO personal facts at all in the message, you MUST output exactly the word: NONE
Do not output anything else.

User Message: "${userMessage}"`;

  try {
    const response = await generateAIResponse(
      [{ role: 'user', content: prompt }],
      null,
      'cascade',
      'You are a strict data extractor.'
    );

    const cleanRes = response.trim().toUpperCase().replace(/[^A-Z]/g, '');
    
    if (cleanRes === 'NONE' || cleanRes === 'NOFACTS' || response.trim() === '') {
      return null;
    }

    return response.trim();
  } catch (e) {
    console.error("Memory Extraction Failed:", e);
    return null;
  }
};
