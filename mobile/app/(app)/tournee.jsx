/**
 * app/(app)/tournee.jsx — Liste des Tournées
 * FIX: URL API corrigée vers /tournees/livreur/
 */
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../../services/api';
import { logout } from '../../store/auth';
import {
  COLORS, RADIUS, SHADOW,
  TOURNEE_STATUT_COLOR, TOURNEE_STATUT_LABEL,
} from '../../constants/theme';

function StatPill({ label, value, color }) {
  return (
    <View style={[styles.statPill, { backgroundColor: color + '14' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: color + 'CC' }]}>{label}</Text>
    </View>
  );
}

function TourneeCard({ tournee, onPress }) {
  const statusColor = TOURNEE_STATUT_COLOR[tournee.statut] || COLORS.textMuted;
  const statusLabel = TOURNEE_STATUT_LABEL[tournee.statut] || tournee.statut;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.cardAccent, { backgroundColor: statusColor }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardRef}>{tournee.reference}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <View style={[styles.badgeDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetail}>
          <Text style={styles.detailIcon}>📍</Text>
          <Text style={styles.detailText}>{tournee.zone_gouvernorat}</Text>
        </View>
        <View style={styles.cardDetail}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>
            {new Date(tournee.date_prevue).toLocaleDateString('fr-FR', {
              weekday: 'short', day: 'numeric', month: 'short'
            })}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.packageBadge}>
            <Text style={styles.packageText}>
              📦 {tournee.nb_commandes ?? 0} commande{(tournee.nb_commandes ?? 0) > 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={styles.cardChevron}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TourneeScreen() {
  const router = useRouter();
  const [tournees, setTournees]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const load = async () => {
    try {
      setError(null);
      // FIX: URL correcte — définie dans tournees/urls.py
      const res = await api.get('/tournees/livreur/tournees/');
      console.log('[TOURNEE] Données reçues:', res.data?.length, 'tournées');
      setTournees(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('[TOURNEE] Erreur chargement:', e.response?.status, e.message);
      const msg = e.response?.data?.detail || 'Impossible de charger les tournées';
      setError(msg);
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        }
      }
    ]);
  };

  const stats = {
    total:     tournees.length,
    en_cours:  tournees.filter(t => t.statut === 'en_cours').length,
    planifiee: tournees.filter(t => t.statut === 'planifiee').length,
    terminee:  tournees.filter(t => t.statut === 'terminee').length,
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Tableau de bord</Text>
          <Text style={styles.headerTitle}>Mes Tournées</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Déco</Text>
        </TouchableOpacity>
      </View>

      {tournees.length > 0 && (
        <View style={styles.statsBar}>
          <StatPill label="Total"     value={stats.total}     color={COLORS.primary} />
          <StatPill label="En cours"  value={stats.en_cours}  color={COLORS.cyan} />
          <StatPill label="Planifiée" value={stats.planifiee} color={COLORS.amber} />
          <StatPill label="Terminée"  value={stats.terminee}  color={COLORS.green} />
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {error && !loading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⚠️</Text>
            <Text style={styles.emptyTitle}>Erreur de chargement</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : tournees.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🚚</Text>
            <Text style={styles.emptyTitle}>Aucune tournée</Text>
            <Text style={styles.emptyText}>
              Les tournées qui vous sont assignées apparaîtront ici.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {tournees.length} tournée{tournees.length > 1 ? 's' : ''} assignée{tournees.length > 1 ? 's' : ''}
            </Text>
            {tournees.map((t) => (
              <TourneeCard
                key={t.id}
                tournee={t}
                onPress={() => router.push(`/(app)/livraison/${t.id}`)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },

  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLabel: { color: COLORS.headerLink, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600', marginBottom: 4 },
  headerTitle: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  logoutBtn:   { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText:  { color: COLORS.headerLink, fontSize: 13, fontWeight: '600' },

  statsBar: {
    backgroundColor: COLORS.primary,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
  },
  statPill:  { flex: 1, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.3 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  sectionLabel:  { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, marginLeft: 2 },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    ...SHADOW.card,
  },
  cardAccent: { width: 4 },
  cardBody:   { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardRef:    { fontFamily: 'monospace', fontSize: 14, fontWeight: '700', color: COLORS.primary },

  badge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.full },
  badgeDot:  { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  cardDetail: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detailIcon: { fontSize: 13 },
  detailText: { fontSize: 13, color: COLORS.textSecondary },

  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  packageBadge: { backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4 },
  packageText:  { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  cardChevron:  { fontSize: 22, color: COLORS.textLight, fontWeight: '300' },

  empty:     { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle:{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  retryBtn:  { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: COLORS.white, fontWeight: '700' },
});