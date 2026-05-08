import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────
// CONFIGURATION API
//
// Sur émulateur Android  → utiliser 10.0.2.2 (hôte de l'émulateur)
// Sur appareil physique  → utiliser l'IP LAN de votre machine
//                          ex: 192.168.1.53
// Sur émulateur iOS      → localhost fonctionne
// ─────────────────────────────────────────────────────────────

const API_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  'http://192.168.1.53:8000/api';

export const config = {
  apiUrl: API_URL,
  timeout: 15000,  // 15s au lieu de 10s pour les connexions lentes
};

export default config;