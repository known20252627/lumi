// Lightweight AES-GCM encryption for API keys in localStorage

// Generate a random key and store it in localStorage if it doesn't exist
const getOrGenerateKey = async () => {
  let keyStr = localStorage.getItem('lumi_enc_key');
  let key;
  if (keyStr) {
    const rawKey = Uint8Array.from(atob(keyStr), c => c.charCodeAt(0));
    key = await window.crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  } else {
    key = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const exported = await window.crypto.subtle.exportKey("raw", key);
    const exportedStr = btoa(String.fromCharCode(...new Uint8Array(exported)));
    localStorage.setItem('lumi_enc_key', exportedStr);
  }
  return key;
};

export const encryptText = async (text) => {
  if (!text) return text;
  try {
    const key = await getOrGenerateKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encoded
    );
    // Combine IV and ciphertext for storage
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error("Encryption failed", e);
    return text; // fallback to plaintext if crypto fails
  }
};

export const decryptText = async (encryptedStr) => {
  if (!encryptedStr) return encryptedStr;
  try {
    // Check if it looks like our encrypted format (base64)
    if (!encryptedStr.includes('=') && encryptedStr.length < 40) return encryptedStr; // Probably plain text
    
    const combined = Uint8Array.from(atob(encryptedStr), c => c.charCodeAt(0));
    if (combined.length < 12) return encryptedStr; // Too short to be our AES-GCM format
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const key = await getOrGenerateKey();
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    // If decryption fails (e.g., was stored as plaintext before this feature), return as is
    return encryptedStr;
  }
};
