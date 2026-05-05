import Constants from 'expo-constants';

const API_URL = 
  Constants.expoConfig?.extra?.apiUrl || 
  'http://192.168.1.53:8000/api';  // ← remplace localhost par ton IP

export const config = {
  apiUrl: API_URL,
  timeout: 10000,
};

export default config;