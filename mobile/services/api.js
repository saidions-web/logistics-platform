import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { config } from '../config';

// Callback injecté depuis l'app pour gérer la déconnexion
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// ✅ Log au démarrage pour confirmer l'URL utilisée
console.log('[API] baseURL configurée:', config.apiUrl);

const api = axios.create({
  baseURL: config.apiUrl,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (reqConfig) => {
  try {
    const token = await SecureStore.getItemAsync('access_token');
    if (token) {
      reqConfig.headers = {
        ...reqConfig.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  } catch (e) {
    console.warn('[API] Impossible de lire le token:', e.message);
  }

  // ✅ Log chaque requête pour debug (à retirer en production)
  console.log(`[API] ${reqConfig.method?.toUpperCase()} ${reqConfig.baseURL}${reqConfig.url}`);

  return reqConfig;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // ✅ Log détaillé des erreurs réseau
    if (!error.response) {
      console.error('[API] Erreur réseau — pas de réponse du serveur');
      console.error('[API] URL tentée:', error.config?.baseURL + error.config?.url);
      console.error('[API] Vérifiez que Django tourne sur 0.0.0.0:8000');
    }

    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refresh = await SecureStore.getItemAsync('refresh_token');
        if (!refresh) throw new Error('No refresh token');

        const res = await axios.post(
          `${config.apiUrl}/auth/token/refresh/`,
          { refresh },
          { headers: { 'Content-Type': 'application/json' } }
        );

        const newAccess = res.data.access;
        await SecureStore.setItemAsync('access_token', newAccess);
        processQueue(null, newAccess);
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);

      } catch (err) {
        processQueue(err, null);
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');

        if (onUnauthorized) onUnauthorized();

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;