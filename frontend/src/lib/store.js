// src/lib/store.js
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function getJSON(key, fallback = null) {
  try {
    const v = await AsyncStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export async function pushUnique(key, val) {
  const arr = (await getJSON(key, [])) || [];
  if (!arr.includes(val)) {
    arr.push(val);
    await setJSON(key, arr);
  }
  return arr;
}
