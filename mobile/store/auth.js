import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export async function login(email, password) {
  try {
    const res = await api.post('/auth/login/', { email, password });

    const { access, refresh, user } = res.data;

    if (!access || !refresh || !user) {
      throw new Error('Réponse serveur invalide');
    }

    if (user.role !== 'livreur') {
      throw new Error('Accès réservé aux livreurs');
    }

    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);

    // ← PAS d'Alert ici, la navigation se fait dans index.jsx
    return user;

  } catch (err) {
    console.log('LOGIN ERROR:', err.response?.data || err.message);
    throw err;
  }
}

export async function logout() {
  try {
    const refresh = await SecureStore.getItemAsync('refresh_token');
    if (refresh) {
      await api.post('/auth/logout/', { refresh });
    }
  } catch {}

  await SecureStore.deleteItemAsync('access_token');
  await SecureStore.deleteItemAsync('refresh_token');
}