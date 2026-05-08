/**
 * app/index.jsx — Login Screen
 * Design aligned with web DashboardEntreprise theme
 */
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { login } from '../store/auth';
import { COLORS, RADIUS, SHADOW } from '../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState(null);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, trimmedPassword);
      router.replace('/(app)/tournee');
    } catch (e) {
      // Erreur rôle non livreur
      if (e.message === 'Accès réservé aux livreurs') {
        Alert.alert('Accès refusé', "Ce compte n'est pas un compte livreur.");
        return;
      }

      // Erreur réseau (pas de connexion au serveur)
      if (!e.response) {
        Alert.alert(
          'Erreur réseau',
          'Impossible de contacter le serveur. Vérifiez votre connexion et l\'adresse IP du serveur.',
        );
        return;
      }

      // Erreur Django REST Framework — non_field_errors
      const data = e.response?.data;
      if (data?.non_field_errors?.length) {
        Alert.alert('Connexion échouée', data.non_field_errors[0]);
        return;
      }

      // Erreur champ email / password
      if (data?.email?.length) {
        Alert.alert('Connexion échouée', data.email[0]);
        return;
      }
      if (data?.password?.length) {
        Alert.alert('Connexion échouée', data.password[0]);
        return;
      }

      // Erreur HTTP générique
      if (e.response?.status === 401 || e.response?.status === 400) {
        Alert.alert('Connexion échouée', 'Email ou mot de passe incorrect.');
        return;
      }

      if (e.response?.status === 403) {
        Alert.alert('Accès refusé', 'Votre compte n\'est pas autorisé à se connecter.');
        return;
      }

      // Fallback
      Alert.alert('Erreur', e.message || 'Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Top decorative strip */}
      <View style={styles.topStrip} />

      <View style={styles.inner}>
        {/* Logo / Brand */}
        <View style={styles.brandBlock}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>L</Text>
          </View>
          <Text style={styles.logoText}>LogiSync</Text>
          <Text style={styles.logoSub}>Espace Livreur</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connexion</Text>
          <Text style={styles.cardSub}>
            Connectez-vous pour accéder à vos tournées
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Adresse email</Text>
            <TextInput
              style={[styles.input, focused === 'email' && styles.inputFocused]}
              placeholder="vous@exemple.com"
              placeholderTextColor={COLORS.textLight}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              editable={!loading}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              style={[styles.input, focused === 'password' && styles.inputFocused]}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCorrect={false}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              editable={!loading}
              onSubmitEditing={handleLogin}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Text style={styles.btnText}>Se connecter</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Footer note */}
        <Text style={styles.footer}>
          Accès réservé aux livreurs autorisés
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  topStrip: {
    height: '35%',
    backgroundColor: COLORS.primary,
    position: 'absolute',
    top: 0, left: 0, right: 0,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: 1,
  },
  logoSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 28,
    ...SHADOW.strong,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 24,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    borderWidth: 2,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    padding: 15,
    alignItems: 'center',
    marginTop: 8,
    ...SHADOW.card,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 24,
  },
});