import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const fallback = 'http://localhost:5100';
const fromExtra = Constants?.expoConfig?.extra?.API_URL;
const fromEnv = process.env.EXPO_PUBLIC_API_URL;
const androidEmulator = Platform.OS === 'android' ? 'http://10.0.2.2:5100' : null;

function resolveLanApiUrl() {
  try {
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.debuggerHost || '';
    const host = hostUri.split(':')[0];
    if (host && host !== '127.0.0.1' && host !== 'localhost') {
      return `http://${host}:5100`;
    }
  } catch {}
  return null;
}

const lanUrl = Platform.OS !== 'web' ? resolveLanApiUrl() : null;
export const API_URL = (fromEnv || lanUrl || fromExtra || androidEmulator || fallback);

let memoryToken = null;
let selectedBaseUrl = null;

export const setToken = (t) => { memoryToken = t || null; };
export const clearToken = () => { memoryToken = null; };

const client = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000
});

async function pickReachableBaseUrl() {
  if (selectedBaseUrl) return selectedBaseUrl;
  const candidates = [fromEnv, lanUrl, fromExtra, androidEmulator, fallback].filter(Boolean);
  for (const url of candidates) {
    try {
      await axios.get(`${url}/api/test`, { timeout: 2500 });
      selectedBaseUrl = url;
      return selectedBaseUrl;
    } catch {}
  }
  selectedBaseUrl = fallback;
  return selectedBaseUrl;
}

client.interceptors.request.use(async (config) => {
  try {
    const base = await pickReachableBaseUrl();
    if (base && `${base}/api` !== config.baseURL) {
      config.baseURL = `${base}/api`;
    }
  } catch {}
  let token = memoryToken;
  try {
    if (!token) {
      if (Platform.OS !== 'web') {
        try {
          const SecureStore = require('expo-secure-store');
          if (typeof SecureStore?.getItemAsync === 'function') {
            token = await SecureStore.getItemAsync('token');
            memoryToken = token;
          }
        } catch {}
      } else if (typeof window !== 'undefined' && window?.localStorage) {
        token = window.localStorage.getItem('token');
        memoryToken = token;
      }
    }
  } catch {}
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
