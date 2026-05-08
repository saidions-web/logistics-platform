import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export async function login(email, password) {
  try {
    console.log('[AUTH] Tentative login:', email);
    console.log('[AUTH] URL API:', api.defaults.baseURL);

    const res = await api.post('/auth/login/', { email, password });

    console.log('[AUTH] Réponse reçue:', JSON.stringify(res.data));

    const { access, refresh, user } = res.data;

    if (!access || !refresh || !user) {
      console.error('[AUTH] Réponse incomplète:', res.data);
      throw new Error('Réponse serveur invalide');
    }

    if (user.role !== 'livreur') {
      console.warn('[AUTH] Rôle non autorisé:', user.role);
      throw new Error('Accès réservé aux livreurs');
    }

    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);

    console.log('[AUTH] Login réussi pour:', user.email);
    return user;

  } catch (err) {
    // Log détaillé pour debug
    if (err.response) {
      console.error('[AUTH] Erreur HTTP:', err.response.status, JSON.stringify(err.response.data));
    } else if (err.request) {
      console.error('[AUTH] Pas de réponse du serveur — vérifiez l\'IP et le port');
      console.error('[AUTH] URL tentée:', err.config?.url);
    } else {
      console.error('[AUTH] Erreur:', err.message);
    }
    throw err;
  }
}

export async function logout() {
  try {
    const refresh = await SecureStore.getItemAsync('refresh_token');
    if (refresh) {
      await api.post('/auth/logout/', { refresh });
    }
  } catch (err) {
    console.warn('[AUTH] Erreur logout (ignorée):', err.message);
  }

  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
  console.log('[AUTH] Déconnexion effectuée');
}