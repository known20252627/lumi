import * as webllm from '@mlc-ai/web-llm';

export const generateAIResponse = async (messages, progressCallback = null, selectedProvider = 'cascade', systemPrompt = "You are Lumi, a highly expert AI mentor.") => {
  const keys = {
    openai: localStorage.getItem('lumi_openai_key'),
    gemini: localStorage.getItem('lumi_api_key'),
    groq: localStorage.getItem('lumi_groq_key'),
    cerebras: localStorage.getItem('lumi_cerebras_key'),
    sarvam: localStorage.getItem('lumi_sarvam_key')
  };

  // If a specific provider is requested, only try that one.
  if (selectedProvider === 'openai') return await fetchOpenAI(messages, keys.openai, systemPrompt);
  if (selectedProvider === 'gemini') return await fetchGemini(messages, keys.gemini, systemPrompt);
  if (selectedProvider === 'groq') return await fetchGroq(messages, keys.groq, systemPrompt);
  if (selectedProvider === 'cerebras') return await fetchCerebras(messages, keys.cerebras, systemPrompt);
  if (selectedProvider === 'sarvam') return await fetchSarvam(messages, keys.sarvam, systemPrompt);
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
  const response = await fetch("/api/sarvam/chat/completions", {
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
