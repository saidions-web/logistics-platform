import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import api from '../../services/api';
import { logout } from '../../store/auth';

const STATUT_COLOR = {
  planifiee: '#f59e0b',
  en_cours:  '#3b82f6',
  terminee:  '#10b981',
  annulee:   '#6b7280',
};

export default function TourneeScreen() {
  const router = useRouter();
  const [tournees, setTournees]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/entreprise/livreur/tournees/');
      setTournees(res.data);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger les tournées');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e40af" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Tournées</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutBtn}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        contentContainerStyle={styles.scroll}
      >
        {tournees.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Aucune tournée assignée</Text>
          </View>
        ) : (
          tournees.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={styles.card}
              onPress={() => router.push(`/(app)/livraison/${t.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.ref}>{t.reference}</Text>
                <View style={[styles.badge, { backgroundColor: STATUT_COLOR[t.statut] + '22' }]}>
                  <Text style={[styles.badgeText, { color: STATUT_COLOR[t.statut] }]}>
                    {t.statut === 'planifiee' ? 'Planifiée'
                      : t.statut === 'en_cours' ? 'En cours'
                      : t.statut === 'terminee' ? 'Terminée' : 'Annulée'}
                  </Text>
                </View>
              </View>
              <Text style={styles.zone}>📍 {t.zone_gouvernorat}</Text>
              <Text style={styles.date}>📅 {new Date(t.date_prevue).toLocaleDateString('fr-FR')}</Text>
              <Text style={styles.count}>📦 {t.nb_commandes} commande(s)</Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f1f5f9' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:      { backgroundColor: '#1e40af', padding: 20, paddingTop: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  logoutBtn:   { color: '#93c5fd', fontSize: 14 },
  scroll:      { padding: 16 },
  empty:       { alignItems: 'center', marginTop: 60 },
  emptyText:   { color: '#6b7280', fontSize: 16 },
  card:        { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ref:         { fontFamily: 'monospace', fontSize: 15, fontWeight: '700', color: '#1e40af' },
  badge:       { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText:   { fontSize: 12, fontWeight: '600' },
  zone:        { fontSize: 14, color: '#374151', marginBottom: 4 },
  date:        { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  count:       { fontSize: 13, color: '#6b7280' },
});