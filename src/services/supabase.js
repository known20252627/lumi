import { createClient } from '@supabase/supabase-js';

let supabaseInstance = null;

export const getSupabaseClient = () => {
  if (supabaseInstance) return supabaseInstance;
  
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const supabaseUrl = envUrl || localStorage.getItem('lumi_supabase_url');
  const supabaseKey = envKey || localStorage.getItem('lumi_supabase_key');
  
  if (supabaseUrl && supabaseKey) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
  }
  return null;
};

/**
 * Flushes the offline sync queue
 */
export const flushSyncQueue = async () => {
  if (!navigator.onLine) return;
  const rawQueue = localStorage.getItem('lumi_sync_queue');
  if (!rawQueue) return;
  
  let queue = [];
  try { queue = JSON.parse(rawQueue); } catch (e) {}
  
  if (queue.length === 0) return;
  
  const client = getSupabaseClient();
  if (!client) return;
  
  // Just trigger a full sync to reconcile
  const keys = {
    openai: localStorage.getItem('lumi_openai_key') || '',
    gemini: localStorage.getItem('lumi_api_key') || '',
    groq: localStorage.getItem('lumi_groq_key') || '',
    cerebras: localStorage.getItem('lumi_cerebras_key') || '',
    sarvam: localStorage.getItem('lumi_sarvam_key') || ''
  };
  
  try {
    await performCloudSync(keys, 'default-user', true);
    localStorage.removeItem('lumi_sync_queue');
  } catch (e) {
    console.error("Queue flush failed", e);
  }
};

window.addEventListener('online', flushSyncQueue);

const performCloudSync = async (keys, userId = 'default-user', isFlush = false) => {
  const client = getSupabaseClient();
  if (!client) return;

  if (!navigator.onLine && !isFlush) {
    const rawQueue = localStorage.getItem('lumi_sync_queue');
    const queue = rawQueue ? JSON.parse(rawQueue) : [];
    queue.push({ timestamp: Date.now(), type: 'full_sync' });
    localStorage.setItem('lumi_sync_queue', JSON.stringify(queue));
    return;
  }
  
  const memoryRaw = localStorage.getItem('lumi_personal_memory');
  const memoryData = memoryRaw ? JSON.parse(memoryRaw) : [];
  
  const goalsRaw = localStorage.getItem('lumi_planner_goals');
  const goalsData = goalsRaw ? JSON.parse(goalsRaw) : [];
  
  const historyRaw = localStorage.getItem('lumi_chat_history');
  const historyData = historyRaw ? JSON.parse(historyRaw) : [];

  const { error } = await client
    .from('api_keys') // Re-using table for convenience
    .upsert({ 
      id: userId, 
      openai: keys.openai,
      gemini: keys.gemini,
      groq: keys.groq,
      cerebras: keys.cerebras,
      sarvam: keys.sarvam,
      personal_memory: memoryData,
      planner_goals: goalsData,
      chat_history: historyData,
      updated_at: new Date().toISOString()
    });
  
  if (error) {
    console.error("Supabase Sync Error:", error);
    if (!isFlush) {
      const rawQueue = localStorage.getItem('lumi_sync_queue');
      const queue = rawQueue ? JSON.parse(rawQueue) : [];
      queue.push({ timestamp: Date.now(), type: 'full_sync' });
      localStorage.setItem('lumi_sync_queue', JSON.stringify(queue));
    }
  }
};

/**
 * Saves all 6 API keys and Memory to a specific user's row in Supabase.
 * If Supabase is not configured, it silently falls back to localStorage.
 */
export const syncKeysToCloud = async (keys, userId = 'default-user') => {
  // Always save locally first for offline support (Keys should already be encrypted locally if applicable)
  if (keys.openai) localStorage.setItem('lumi_openai_key', keys.openai);
  if (keys.gemini) localStorage.setItem('lumi_api_key', keys.gemini); 
  if (keys.groq) localStorage.setItem('lumi_groq_key', keys.groq);
  if (keys.cerebras) localStorage.setItem('lumi_cerebras_key', keys.cerebras);
  if (keys.sarvam) localStorage.setItem('lumi_sarvam_key', keys.sarvam);

  try {
    await performCloudSync(keys, userId);
  } catch (e) {
    console.error("Failed to push to Supabase", e);
  }
};

/**
 * Pulls API keys and Memory from Supabase and applies them locally.
 */
export const pullKeysFromCloud = async (userId = 'default-user') => {
  const client = getSupabaseClient();
  if (!client) return null;
  
  try {
    const { data, error } = await client
      .from('api_keys')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    if (data) {
      // Apply pulled keys to local storage
      if (data.openai) localStorage.setItem('lumi_openai_key', data.openai);
      if (data.gemini) localStorage.setItem('lumi_api_key', data.gemini); 
      if (data.groq) localStorage.setItem('lumi_groq_key', data.groq);
      if (data.cerebras) localStorage.setItem('lumi_cerebras_key', data.cerebras);
      if (data.sarvam) localStorage.setItem('lumi_sarvam_key', data.sarvam);
      
      if (data.personal_memory) localStorage.setItem('lumi_personal_memory', JSON.stringify(data.personal_memory));
      if (data.planner_goals) localStorage.setItem('lumi_planner_goals', JSON.stringify(data.planner_goals));
      if (data.chat_history) localStorage.setItem('lumi_chat_history', JSON.stringify(data.chat_history));
      
      return data;
    }
  } catch (e) {
    console.error("Failed to pull from Supabase", e);
  }
  return null;
};
