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
 * Saves all 6 API keys and Memory to a specific user's row in Supabase.
 * If Supabase is not configured, it silently falls back to localStorage.
 */
export const syncKeysToCloud = async (keys, userId = 'default-user') => {
  // Always save locally first for offline support
  localStorage.setItem('lumi_openai_key', keys.openai || '');
  localStorage.setItem('lumi_api_key', keys.gemini || ''); 
  localStorage.setItem('lumi_groq_key', keys.groq || '');
  localStorage.setItem('lumi_cerebras_key', keys.cerebras || '');
  localStorage.setItem('lumi_sarvam_key', keys.sarvam || '');

  const client = getSupabaseClient();
  
  // If Supabase is connected, sync them to the cloud
  if (client) {
    try {
      const memoryRaw = localStorage.getItem('lumi_personal_memory');
      const memoryData = memoryRaw ? JSON.parse(memoryRaw) : [];

      const { error } = await client
        .from('api_keys')
        .upsert({ 
          id: userId, 
          openai: keys.openai,
          gemini: keys.gemini,
          groq: keys.groq,
          cerebras: keys.cerebras,
          sarvam: keys.sarvam,
          personal_memory: memoryData,
          updated_at: new Date().toISOString()
        });
      
      if (error) console.error("Supabase Sync Error:", error);
    } catch (e) {
      console.error("Failed to push to Supabase", e);
    }
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
      localStorage.setItem('lumi_openai_key', data.openai || '');
      localStorage.setItem('lumi_api_key', data.gemini || ''); 
      localStorage.setItem('lumi_groq_key', data.groq || '');
      localStorage.setItem('lumi_cerebras_key', data.cerebras || '');
      localStorage.setItem('lumi_sarvam_key', data.sarvam || '');
      
      if (data.personal_memory) {
        localStorage.setItem('lumi_personal_memory', JSON.stringify(data.personal_memory));
      }
      return data;
    }
  } catch (e) {
    console.error("Failed to pull from Supabase", e);
  }
  return null;
};
