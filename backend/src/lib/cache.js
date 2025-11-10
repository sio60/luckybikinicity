// src/lib/cache.js
export async function getFortuneFromCache(env, key) {
  if (!env.FORTUNE_KV) {
    console.warn("KV not configured, skipping cache GET");
    return null;
  }
  return await env.FORTUNE_KV.get(key);
}

export async function setFortuneToCache(env, key, value, ttlSeconds = 86400) {
  if (!env.FORTUNE_KV) {
    console.warn("KV not configured, skipping cache PUT");
    return;
  }
  await env.FORTUNE_KV.put(key, value, { expirationTtl: ttlSeconds });
}
