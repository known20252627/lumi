import * as webllm from '@mlc-ai/web-llm';
import { decryptText } from './crypto';

export const generateAIResponse = async (messages, progressCallback = null, selectedProvider = 'cascade', systemPrompt = "You are Lumi, a highly expert AI mentor.", onChunk = null) => {
  // Automatically push new memory to Supabase Cloud
  const { syncKeysToCloud } = await import('../services/supabase.js');
  const keys = {
    openai: (await decryptText(localStorage.getItem('lumi_openai_key')) || '').trim(),
    gemini: (await decryptText(localStorage.getItem('lumi_api_key')) || '').trim(),
    groq: (await decryptText(localStorage.getItem('lumi_groq_key')) || '').trim(),
    cerebras: (await decryptText(localStorage.getItem('lumi_cerebras_key')) || '').trim(),
    sarvam: (await decryptText(localStorage.getItem('lumi_sarvam_key')) || '').trim()
  };
  await syncKeysToCloud(keys);

  // If a specific provider is requested, only try that one.
  if (selectedProvider === 'openai' && keys.openai) return await fetchOpenAICompatibleStream("/api/openai/v1/chat/completions", keys.openai, "gpt-4o", messages, systemPrompt, onChunk, 'openai');
  if (selectedProvider === 'gemini' && keys.gemini) return await fetchGemini(messages, keys.gemini, systemPrompt); // Gemini streaming unsupported here for now
  if (selectedProvider === 'groq' && keys.groq) return await fetchOpenAICompatibleStream("/api/groq/openai/v1/chat/completions", keys.groq, "llama-3.1-8b-instant", messages, systemPrompt, onChunk, 'groq');
  if (selectedProvider === 'cerebras' && keys.cerebras) return await fetchOpenAICompatibleStream("/api/cerebras/v1/chat/completions", keys.cerebras, "llama3.1-8b", messages, systemPrompt, onChunk, 'cerebras');
  if (selectedProvider === 'sarvam' && keys.sarvam) return await fetchOpenAICompatibleStream("/api/sarvam/v1/chat/completions", keys.sarvam, "sarvam-30b", messages, systemPrompt, onChunk, 'sarvam');
  if (selectedProvider === 'local') return await runLocalWebLLM(messages, progressCallback, systemPrompt, onChunk);

  // Otherwise, run the Cascade
  if (keys.openai) {
    try { return await fetchOpenAICompatibleStream("/api/openai/v1/chat/completions", keys.openai, "gpt-4o", messages, systemPrompt, onChunk, 'openai'); } catch (e) { console.warn("OpenAI Failed", e); }
  }
  if (keys.cerebras) {
    try { return await fetchOpenAICompatibleStream("/api/cerebras/v1/chat/completions", keys.cerebras, "llama3.1-8b", messages, systemPrompt, onChunk, 'cerebras'); } catch (e) { console.warn("Cerebras Failed", e); }
  }
  if (keys.gemini) {
    try { return await fetchGemini(messages, keys.gemini, systemPrompt); } catch (e) { console.warn("Gemini Failed", e); }
  }
  if (keys.groq) {
    try { return await fetchOpenAICompatibleStream("/api/groq/openai/v1/chat/completions", keys.groq, "llama-3.1-8b-instant", messages, systemPrompt, onChunk, 'groq'); } catch (e) { console.warn("Groq Failed", e); }
  }
  if (keys.sarvam) {
    try { return await fetchOpenAICompatibleStream("/api/sarvam/v1/chat/completions", keys.sarvam, "sarvam-30b", messages, systemPrompt, onChunk, 'sarvam'); } catch (e) { console.warn("Sarvam Failed", e); }
  }

  // Fallback
  return await runLocalWebLLM(messages, progressCallback, systemPrompt, onChunk);
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

const fetchOpenAICompatibleStream = async (url, apiKey, model, messages, systemPrompt, onChunk, provider) => {
  const formatted = [{ role: 'system', content: systemPrompt }, ...messages];
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: formatted, temperature: 0.7, stream: !!onChunk })
  });

  if (!response.ok) {
    const err = await response.json().catch(()=>({}));
    throw new Error(err.error?.message || err.message || JSON.stringify(err));
  }

  if (!onChunk) {
    const data = await response.json();
    recordUsage(provider, data.usage?.total_tokens);
    return data.choices[0].message.content;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete chunk

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed === 'data: [DONE]') return fullText;
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          if (data.choices && data.choices[0].delta?.content) {
            fullText += data.choices[0].delta.content;
            onChunk(fullText);
          }
        } catch (e) {
          // Ignore partial parse failures
        }
      }
    }
  }
  return fullText;
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
    throw new Error(err.error?.message || err.message || JSON.stringify(err));
  }
  const data = await response.json();
  recordUsage('gemini', data.usageMetadata?.totalTokenCount);
  return data.candidates[0].content.parts[0].text;
};


// --- LOCAL WEBLLM ---

let localEngine = null;

const runLocalWebLLM = async (messages, progressCallback, systemPrompt, onChunk) => {
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
    
    if (onChunk) {
      const reply = await localEngine.chat.completions.create({ messages: formatted, stream: true });
      let fullText = "";
      if (progressCallback) progressCallback(""); 
      for await (const chunk of reply) {
        if (chunk.choices[0]?.delta?.content) {
           fullText += chunk.choices[0].delta.content;
           onChunk(fullText);
        }
      }
      return fullText;
    } else {
      const reply = await localEngine.chat.completions.create({ messages: formatted });
      if (progressCallback) progressCallback(""); 
      recordUsage('local', reply.usage?.total_tokens);
      return reply.choices[0].message.content;
    }
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
