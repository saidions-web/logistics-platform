import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────
// CONFIGURATION API
//
// Sur émulateur Android  → utiliser 10.0.2.2 (hôte de l'émulateur)
// Sur appareil physique  → utiliser l'IP LAN de votre machine
//                          ex: 192.168.1.53
// Sur émulateur iOS      → localhost fonctionne
// ─────────────────────────────────────────────────────────────

const rawUrl = Constants.expoConfig?.extra?.apiUrl;

// ✅ Vérifie que la valeur est une vraie URL (pas vide, pas null, pas undefined)
// Une chaîne vide "" est falsy en JS mais Constants peut retourner autre chose
const API_URL =
  rawUrl && typeof rawUrl === 'string' && rawUrl.startsWith('http')
    ? rawUrl
    : 'http://192.168.1.7:8000/api';

export const config = {
  apiUrl: API_URL,
  timeout: 15000,
};

export default config;