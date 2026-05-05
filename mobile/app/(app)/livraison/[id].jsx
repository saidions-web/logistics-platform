/**
 * app/(app)/livraison/[id].jsx — Détail Tournée Livreur
 * FIX GPS :
 *  1. Utilise tournee.livreur (int FK) au lieu de tournee.livreur.id
 *  2. Import expo-location statique en haut du fichier
 *  3. Accuracy HIGH (Location.Accuracy.High = 5)
 *  4. Envoi GPS démarre dès que la tournée est 'en_cours' ET que l'id livreur est connu
 *  5. Nettoyage propre du watchPositionAsync à l'unmount
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
// ✅ FIX 1 : Import statique (pas dynamique dans une fonction)
import * as Location from 'expo-location';

import api from '../../../services/api';
import {
  COLORS, RADIUS, SHADOW,
  BADGE, STATUT_BADGE, STATUT_LABEL,
  TOURNEE_STATUT_COLOR, TOURNEE_STATUT_LABEL,
} from '../../../constants/theme';

const MOTIFS = [
  { value: 'client_absent',    label: 'Client absent' },
  { value: 'injoignable',      label: 'Injoignable' },
  { value: 'refus_client',     label: 'Refus du client' },
  { value: 'adresse_invalide', label: 'Adresse invalide' },
  { value: 'autre',            label: 'Autre' },
];

// ✅ FIX 2 : Intervalle réduit à 15s pour un suivi plus fluide
const GPS_INTERVAL_MS = 15000;

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function ouvrirNavigation(etape) {
  const { dest_latitude, dest_longitude, commande_dest_adresse, commande_gouvernorat } = etape || {};
  const hasGPS = dest_latitude && dest_longitude;

  const googleUrl = hasGPS
    ? `https://www.google.com/maps/dir/?api=1&destination=${dest_latitude},${dest_longitude}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${commande_dest_adresse || ''}, ${commande_gouvernorat || ''}, Tunisie`)}&travelmode=driving`;

  const wazeUrl = hasGPS
    ? `https://waze.com/ul?ll=${dest_latitude},${dest_longitude}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(`${commande_dest_adresse || ''}, ${commande_gouvernorat || ''}, Tunisie`)}&navigate=yes`;

  Alert.alert(
    '🗺 Navigation',
    hasGPS ? 'Position GPS précise disponible' : 'Navigation par adresse',
    [
      { text: 'Google Maps', onPress: () => Linking.openURL(googleUrl).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir Google Maps")) },
      { text: 'Waze',        onPress: () => Linking.openURL(wazeUrl).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir Waze")) },
      { text: 'Annuler',     style: 'cancel' },
    ]
  );
}

// ─────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────
function SummaryItem({ value, label, color }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function SummaryBar({ etapes }) {
  const total   = etapes.length;
  const livrees = etapes.filter(e => e.commande_statut === 'livree').length;
  const retours = etapes.filter(e => e.commande_statut === 'retournee').length;
  const restant = total - livrees - retours;

  return (
    <View style={styles.summaryBar}>
      <SummaryItem value={total}   label="Total"   color={COLORS.primary} />
      <View style={styles.summaryDivider} />
      <SummaryItem value={livrees} label="Livrées" color={COLORS.green} />
      <View style={styles.summaryDivider} />
      <SummaryItem value={retours} label="Retours" color={COLORS.red} />
      <View style={styles.summaryDivider} />
      <SummaryItem value={restant} label="Restant" color={COLORS.amber} />
    </View>
  );
}

function StatusBadge({ statut }) {
  const key   = STATUT_BADGE?.[statut] || 'default';
  const theme = BADGE?.[key] || { bg: '#e5e7eb', text: '#6b7280' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: theme.bg }]}>
      <Text style={[styles.statusBadgeText, { color: theme.text }]}>
        {STATUT_LABEL?.[statut] || statut}
      </Text>
    </View>
  );
}

function EtapeCard({ etape, estEnCours, estTerminee, onLivrer, onRetour, onNaviguer, onCall }) {
  const estLivree   = etape.commande_statut === 'livree';
  const estRetournee = etape.commande_statut === 'retournee';

  return (
    <View style={[
      styles.etapeCard,
      estLivree    && styles.etapeCardLivree,
      estRetournee && styles.etapeCardRetournee,
    ]}>
      <View style={[
        styles.etapeOrder,
        estLivree    && { backgroundColor: COLORS.green },
        estRetournee && { backgroundColor: COLORS.red },
      ]}>
        <Text style={styles.etapeOrderText}>
          {estLivree ? '✓' : estRetournee ? '↩' : etape.ordre}
        </Text>
      </View>

      <View style={styles.etapeBody}>
        <View style={styles.etapeHeader}>
          <Text style={styles.etapeRef}>{etape.commande_reference}</Text>
          <StatusBadge statut={etape.commande_statut} />
        </View>

        <Text style={styles.etapeMontant}>
          💰 {etape.commande_montant} TND
        </Text>

        <View style={styles.clientRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName}>
              {etape.commande_dest_nom} {etape.commande_dest_prenom || ''}
            </Text>
            <Text style={styles.clientAddr} numberOfLines={2}>
              📍 {etape.commande_dest_adresse}, {etape.commande_gouvernorat}
            </Text>
          </View>
          {etape.commande_dest_telephone && (
            <TouchableOpacity style={styles.phoneBtn} onPress={onCall} activeOpacity={0.8}>
              <Text style={styles.phoneBtnIcon}>📞</Text>
            </TouchableOpacity>
          )}
        </View>

        {!estTerminee && (
          <TouchableOpacity style={styles.navBtn} onPress={onNaviguer} activeOpacity={0.85}>
            <Text style={styles.navBtnText}>🗺 Naviguer vers le client</Text>
          </TouchableOpacity>
        )}

        {estEnCours && !estLivree && !estRetournee && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.btnLivrer} onPress={onLivrer} activeOpacity={0.85}>
              <Text style={styles.btnLivrerText}>✓ Livré</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnRetour} onPress={onRetour} activeOpacity={0.85}>
              <Text style={styles.btnRetourText}>↩ Retour</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// MODAL PREUVE DE LIVRAISON
// ─────────────────────────────────────────
function PreuveLivraisonModal({ visible, etape, onClose, onConfirm, loading }) {
  const [photoUri, setPhotoUri]       = useState(null);
  const [commentaire, setCommentaire] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!photoUri) {
      Alert.alert('Photo requise', 'Vous devez prendre une photo comme preuve de livraison.');
      return;
    }
    onConfirm({ etape, photoUri, commentaire });
  };

  const handleClose = () => {
    setPhotoUri(null);
    setCommentaire('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Preuve de Livraison</Text>
          <Text style={styles.modalSub}>Commande : {etape?.commande_reference}</Text>

          <TouchableOpacity style={styles.photoPickBtn} onPress={pickImage}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <>
                <Text style={styles.photoPickIcon}>📸</Text>
                <Text style={styles.photoPickText}>Prendre une photo du colis livré</Text>
              </>
            )}
          </TouchableOpacity>

          {photoUri && (
            <TouchableOpacity style={styles.photoRetake} onPress={pickImage}>
              <Text style={styles.photoRetakeText}>↻ Reprendre la photo</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.modalSectionLabel}>Commentaire (optionnel)</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Ex : Livré en main propre, signature obtenue..."
            placeholderTextColor={COLORS.textMuted}
            value={commentaire}
            onChangeText={setCommentaire}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnConfirm, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnConfirmText}>Confirmer la livraison</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────
// MODAL RETOUR
// ─────────────────────────────────────────
function RetourModal({ visible, onClose, onConfirm, loading }) {
  const [motif, setMotif]             = useState('');
  const [commentaire, setCommentaire] = useState('');

  const reset = () => { setMotif(''); setCommentaire(''); };

  const handleConfirm = () => {
    if (!motif) {
      Alert.alert('Motif requis', 'Veuillez sélectionner un motif de retour.');
      return;
    }
    onConfirm({ motif, commentaire });
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>↩ Déclarer un retour</Text>
            <TouchableOpacity onPress={handleClose} style={styles.modalCloseBtn}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.modalSectionLabel}>Motif du retour *</Text>
            {MOTIFS.map((m) => (
              <TouchableOpacity
                key={m.value}
                style={[styles.motifBtn, motif === m.value && styles.motifBtnActive]}
                onPress={() => setMotif(m.value)}
              >
                <View style={[styles.motifRadio, motif === m.value && styles.motifRadioActive]} />
                <Text style={[styles.motifLabel, motif === m.value && styles.motifLabelActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.modalSectionLabel, { marginTop: 16 }]}>Commentaire (optionnel)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Ex : Client absent, boîte aux lettres pleine..."
              placeholderTextColor={COLORS.textMuted}
              value={commentaire}
              onChangeText={setCommentaire}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.btnCancel} onPress={handleClose}>
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnConfirmRetour, loading && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.btnConfirmRetourText}>Confirmer</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────
// ÉCRAN PRINCIPAL
// ─────────────────────────────────────────
export default function LivraisonDetailScreen() {
  const { id } = useLocalSearchParams();
  const router  = useRouter();

  const [tournee, setTournee]         = useState(null);
  const [etapes, setEtapes]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [gpsStatus, setGpsStatus]     = useState('idle'); // 'idle' | 'active' | 'error'

  const [retourTarget, setRetourTarget]   = useState(null);
  const [livrerTarget, setLivrerTarget]   = useState(null);
  const [retourLoading, setRetourLoading] = useState(false);
  const [preuveLoading, setPreuveLoading] = useState(false);

  // ✅ FIX 3 : On utilise un ref pour stocker l'abonnement watchPositionAsync
  const gpsSubscriptionRef = useRef(null);
  const gpsIntervalRef     = useRef(null);

  // ─── Chargement des données ───────────────────────────────────
  const load = useCallback(async () => {
    try {
      const [resTournee, resEtapes] = await Promise.all([
        api.get(`/entreprise/livreur/tournees/${id}/`),
        api.get(`/entreprise/livreur/tournees/${id}/commandes/`),
      ]);
      setTournee(resTournee.data);
      setEtapes(resEtapes.data);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de charger le détail de la tournée.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ─── GPS : démarre / stoppe selon statut tournée ──────────────
  useEffect(() => {
    // ✅ FIX 4 : livreur est un INT (FK), pas un objet
    // Le sérialiseur TourneeSerializer renvoie livreur comme l'ID entier
    const livreurId = tournee?.livreur;   // int directement
    const estEnCours = tournee?.statut === 'en_cours';

    if (!estEnCours || !livreurId) {
      // Arrêter le GPS si la tournée n'est plus en cours
      stopGPS();
      return;
    }

    startGPS(livreurId);

    return () => stopGPS();
  }, [tournee?.statut, tournee?.livreur]);

  // ─── Fonctions GPS ────────────────────────────────────────────

  const stopGPS = () => {
    if (gpsSubscriptionRef.current) {
      gpsSubscriptionRef.current.remove();
      gpsSubscriptionRef.current = null;
    }
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
  };

  const startGPS = async (livreurId) => {
    // Éviter double démarrage
    if (gpsSubscriptionRef.current || gpsIntervalRef.current) return;

    try {
      // ✅ FIX 5 : Demande de permission propre
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('error');
        Alert.alert(
          'GPS requis',
          'Activez la localisation pour permettre le suivi de votre tournée.',
          [{ text: 'OK' }]
        );
        return;
      }

      setGpsStatus('active');

      // Envoyer la position immédiatement
      await sendPosition(livreurId);

      // ✅ FIX 6 : Polling régulier via setInterval (plus fiable que watchPositionAsync en background)
      gpsIntervalRef.current = setInterval(() => {
        sendPosition(livreurId);
      }, GPS_INTERVAL_MS);

    } catch (err) {
      console.error('[GPS] Erreur démarrage :', err);
      setGpsStatus('error');
    }
  };

  // ✅ FIX 7 : Fonction sendPosition isolée et réutilisable
  const sendPosition = async (livreurId) => {
    try {
      // ✅ FIX 8 : Accuracy HIGH (5) au lieu de Balanced (4)
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await api.post(`/entreprise/livreurs/${livreurId}/position/`, {
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      console.log(`[GPS] Position envoyée : ${loc.coords.latitude}, ${loc.coords.longitude}`);
    } catch (err) {
      // Erreur silencieuse — on réessaiera au prochain tick
      console.warn('[GPS] Échec envoi position :', err?.message || err);
    }
  };

  // ─── Actions tournée ──────────────────────────────────────────

  const changerStatutTournee = async (nouveauStatut) => {
    const msg = nouveauStatut === 'en_cours' ? 'Démarrer la tournée ?' : 'Terminer la tournée ?';
    Alert.alert('Confirmation', msg, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer',
        onPress: async () => {
          setActionLoading(true);
          try {
            await api.patch(`/entreprise/livreur/tournees/${id}/statut/`, {
              statut: nouveauStatut,
            });
            await load();
          } catch (err) {
            Alert.alert('Erreur', err.response?.data?.detail || 'Impossible de modifier le statut.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleLivrer = (etape) => {
    setLivrerTarget(etape);
  };

  const handlePreuveConfirm = async ({ etape, photoUri, commentaire }) => {
    setPreuveLoading(true);
    try {
      await api.patch(`/entreprise/commandes/${etape.commande}/statut/`, {
        statut: 'livree',
        commentaire: commentaire || 'Livré avec photo de preuve via application mobile',
      });
      setLivrerTarget(null);
      await load();
      Alert.alert('✓ Succès', 'Commande marquée comme livrée avec preuve.');
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.detail || 'Impossible de confirmer la livraison.');
    } finally {
      setPreuveLoading(false);
    }
  };

  const handleRetourConfirm = async ({ motif, commentaire }) => {
    if (!retourTarget) return;
    setRetourLoading(true);
    try {
      await api.post('/retours/declarer/', {
        commande_id: retourTarget.commande,
        motif,
        commentaire,
      });
      setRetourTarget(null);
      await load();
      Alert.alert('Retour enregistré');
    } catch (err) {
      Alert.alert('Erreur', err.response?.data?.detail || 'Impossible de déclarer le retour.');
    } finally {
      setRetourLoading(false);
    }
  };

  const handleCall = (telephone) => {
    if (!telephone) return;
    const tel = telephone.replace(/\s/g, '');
    Linking.openURL(`tel:${tel}`).catch(() =>
      Alert.alert('Erreur', "Impossible d'ouvrir le téléphone.")
    );
  };

  // ─── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Chargement…</Text>
      </View>
    );
  }

  const estEnCours  = tournee?.statut === 'en_cours';
  const estPlanifie = tournee?.statut === 'planifiee';
  const estTerminee = tournee?.statut === 'terminee';

  const statusColor = TOURNEE_STATUT_COLOR?.[tournee?.statut] || COLORS.textMuted;
  const statusLabel = TOURNEE_STATUT_LABEL?.[tournee?.statut] || tournee?.statut;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerRef}>{tournee?.reference}</Text>
          <View style={[styles.headerBadge, { backgroundColor: statusColor + '22' }]}>
            <View style={[styles.headerBadgeDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.headerBadgeText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* ✅ Indicateur GPS visible */}
        <View style={styles.gpsIndicator}>
          <View style={[
            styles.gpsDot,
            gpsStatus === 'active' && styles.gpsDotActive,
            gpsStatus === 'error'  && styles.gpsDotError,
          ]} />
          <Text style={styles.gpsLabel}>
            {gpsStatus === 'active' ? 'GPS' : gpsStatus === 'error' ? 'GPS!' : ''}
          </Text>
        </View>
      </View>

      {/* Info bar */}
      <View style={styles.infoBar}>
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>📅</Text>
          <Text style={styles.infoText}>
            {tournee?.date_prevue
              ? new Date(tournee.date_prevue).toLocaleDateString('fr-FR', {
                  weekday: 'short', day: 'numeric', month: 'short',
                })
              : '—'}
          </Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoItem}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText}>{tournee?.zone_gouvernorat || '—'}</Text>
        </View>
        {estEnCours && gpsStatus === 'active' && (
          <>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🛰</Text>
              <Text style={[styles.infoText, { color: '#4ade80' }]}>Suivi actif</Text>
            </View>
          </>
        )}
      </View>

      {/* Summary */}
      {etapes.length > 0 && <SummaryBar etapes={etapes} />}

      {/* Action Tournée */}
      {(estPlanifie || estEnCours) && (
        <View style={styles.tourneeActionBar}>
          {estPlanifie && (
            <TouchableOpacity
              style={[styles.tourneeActionBtn, { backgroundColor: COLORS.primary }, actionLoading && { opacity: 0.6 }]}
              onPress={() => changerStatutTournee('en_cours')}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.tourneeActionBtnText}>▶ Démarrer la tournée</Text>
              }
            </TouchableOpacity>
          )}
          {estEnCours && (
            <TouchableOpacity
              style={[styles.tourneeActionBtn, { backgroundColor: COLORS.green }, actionLoading && { opacity: 0.6 }]}
              onPress={() => changerStatutTournee('terminee')}
              disabled={actionLoading}
            >
              {actionLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.tourneeActionBtnText}>✓ Terminer la tournée</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Liste des étapes */}
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
        {etapes.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Aucune commande</Text>
          </View>
        ) : (
          etapes.map((etape) => (
            <EtapeCard
              key={etape.id}
              etape={etape}
              estEnCours={estEnCours}
              estTerminee={estTerminee}
              onLivrer={() => handleLivrer(etape)}
              onRetour={() => setRetourTarget(etape)}
              onNaviguer={() => ouvrirNavigation(etape)}
              onCall={() => handleCall(etape.commande_dest_telephone)}
            />
          ))
        )}
      </ScrollView>

      {/* Modals */}
      <PreuveLivraisonModal
        visible={!!livrerTarget}
        etape={livrerTarget}
        onClose={() => setLivrerTarget(null)}
        onConfirm={handlePreuveConfirm}
        loading={preuveLoading}
      />

      <RetourModal
        visible={!!retourTarget}
        onClose={() => setRetourTarget(null)}
        onConfirm={handleRetourConfirm}
        loading={retourLoading}
      />
    </View>
  );
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  loadingContainer: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText:      { marginTop: 12, color: COLORS.textMuted, fontSize: 14 },

  header:        { backgroundColor: COLORS.primary, paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backIconBtn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  backIcon:      { color: '#fff', fontSize: 24, fontWeight: '300' },
  headerCenter:  { flex: 1, alignItems: 'center' },
  headerRef:     { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  headerBadgeDot:{ width: 8, height: 8, borderRadius: 4 },
  headerBadgeText:{ fontSize: 12, fontWeight: '700' },

  // ✅ Indicateur GPS dans le header
  gpsIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gpsDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  gpsDotActive: { backgroundColor: '#4ade80' },
  gpsDotError:  { backgroundColor: '#f87171' },
  gpsLabel:     { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700' },

  infoBar:    { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  infoItem:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoIcon:   { fontSize: 14 },
  infoText:   { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  infoDivider:{ width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 12 },

  summaryBar:     { backgroundColor: COLORS.white, flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryValue:   { fontSize: 20, fontWeight: '800' },
  summaryLabel:   { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  summaryDivider: { width: 1, height: 32, backgroundColor: COLORS.border },

  tourneeActionBar:    { padding: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.border },
  tourneeActionBtn:    { paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  tourneeActionBtnText:{ color: '#fff', fontWeight: '700', fontSize: 16 },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },

  etapeCard:         { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', ...SHADOW.card, borderWidth: 1, borderColor: COLORS.border },
  etapeCardLivree:   { borderColor: COLORS.green + '40' },
  etapeCardRetournee:{ borderColor: COLORS.red + '40' },
  etapeOrder:        { width: 48, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  etapeOrderText:    { color: '#fff', fontSize: 16, fontWeight: '800' },
  etapeBody:         { flex: 1, padding: 14 },
  etapeHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  etapeRef:          { fontFamily: 'monospace', fontWeight: '700', color: COLORS.primary },
  etapeMontant:      { fontSize: 13, fontWeight: '700', color: COLORS.amber, marginBottom: 8 },
  clientRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  clientName:        { fontSize: 15, fontWeight: '600' },
  clientAddr:        { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },
  phoneBtn:          { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.green + '20', justifyContent: 'center', alignItems: 'center' },
  phoneBtnIcon:      { fontSize: 20 },
  navBtn:            { backgroundColor: COLORS.primaryBg, paddingVertical: 10, borderRadius: RADIUS.md, alignItems: 'center', marginBottom: 12 },
  navBtnText:        { color: COLORS.primary, fontWeight: '700' },
  actionRow:         { flexDirection: 'row', gap: 10 },
  btnLivrer:         { flex: 1, backgroundColor: COLORS.green, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center' },
  btnLivrerText:     { color: '#fff', fontWeight: '700' },
  btnRetour:         { flex: 1, backgroundColor: '#fee2e2', paddingVertical: 12, borderRadius: RADIUS.md, alignItems: 'center', borderWidth: 1, borderColor: COLORS.red + '30' },
  btnRetourText:     { color: COLORS.red, fontWeight: '700' },

  statusBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalCard:          { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:         { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSub:           { fontSize: 13, color: COLORS.textMuted, marginBottom: 16 },
  modalHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalCloseBtn:      { padding: 8 },
  modalCloseText:     { fontSize: 18, color: '#94a3b8' },
  modalSectionLabel:  { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  motifBtn:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 8 },
  motifBtnActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08' },
  motifRadio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border },
  motifRadioActive:   { borderColor: COLORS.primary },
  motifLabel:         { fontSize: 14, color: COLORS.textSecondary },
  motifLabelActive:   { color: COLORS.primary, fontWeight: '700' },
  commentInput:       { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, minHeight: 80, textAlignVertical: 'top', fontSize: 14 },

  photoPickBtn:   { backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.lg, paddingVertical: 32, alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary + '30', borderStyle: 'dashed', marginBottom: 12 },
  photoPickIcon:  { fontSize: 48, marginBottom: 8 },
  photoPickText:  { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
  photoPreview:   { width: '100%', height: 220, borderRadius: RADIUS.lg },
  photoRetake:    { alignItems: 'center', marginBottom: 12 },
  photoRetakeText:{ color: COLORS.primary, fontWeight: '600' },

  modalFooter:         { flexDirection: 'row', gap: 12, marginTop: 20 },
  btnCancel:           { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  btnCancelText:       { color: COLORS.textMuted, fontWeight: '600' },
  btnConfirm:          { flex: 1, backgroundColor: COLORS.green, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  btnConfirmText:      { color: '#fff', fontWeight: '700' },
  btnConfirmRetour:    { flex: 1, backgroundColor: COLORS.red, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: 'center' },
  btnConfirmRetourText:{ color: '#fff', fontWeight: '700' },

  empty:      { alignItems: 'center', marginTop: 80 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
});