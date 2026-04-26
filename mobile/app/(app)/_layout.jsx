import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { setUnauthorizedHandler } from '../../services/api';

export default function AppLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Handler pour déconnexion forcée (token expiré)
    setUnauthorizedHandler(() => {
      router.replace('/');
    });

    // Vérifier token au démarrage
    SecureStore.getItemAsync('access_token').then((token) => {
      if (!token) {
        router.replace('/');
      }
      setChecking(false);
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="tournee" />
      <Stack.Screen name="livraison/[id]" />
    </Stack>
  );
}