/**
 * [id].jsx — Détail d'une tournée livreur (Version Finale avec Appel Téléphone)
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Linking, Modal, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import api from '../../../services/api';

const MOTIFS = [
  { value: 'client_absent',    label: 'Client absent' },
  { value: 'injoignable',      label: 'Injoignable' },
  { value: 'refus_client',     label: 'Refus du client' },
  { value: 'adresse_invalide', label: 'Adresse invalide' },
  { value: 'autre',            label: 'Autre' },
];

const GPS_INTERVAL = 30000; // 30 secondes

// Helper Navigation
function ouvrirNavigation(etape) {
  const { dest_latitude, dest_longitude, commande_dest_adresse, commande_gouvernorat } = etape || {};

  const hasGPS = dest_latitude && dest_longitude;
  let googleUrl, wazeUrl;

  if (hasGPS) {
    const lat = dest_latitude;
    const lng = dest_longitude;
    googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    wazeUrl   = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  } else {
    const adresse = encodeURIComponent(`${commande_dest_adresse || ''}, ${commande_gouvernorat || ''}, Tunisie`);
    googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${adresse}&travelmode=driving`;
    wazeUrl   = `https://waze.com/ul?q=${adresse}&navigate=yes`;
  }

  Alert.alert(
    '🗺️ Navigation',
    hasGPS ? 'Position GPS précise' : 'Navigation par adresse',
    [
      { text: 'Google Maps', onPress: () => Linking.openURL(googleUrl).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps')) },
      { text: 'Waze',        onPress: () => Linking.openURL(wazeUrl).catch(() => Alert.alert('Erreur', 'Impossible d\'ouvrir Waze')) },
      { text: 'Annuler', style: 'cancel' },
    ]
  );
}

export default function LivraisonScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [tournee, setTournee] = useState(null);
  const [etapes, setEtapes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [retourTarget, setRetourTarget] = useState(null);
  const [showPreuveModal, setShowPreuveModal] = useState(false);
  const [currentEtape, setCurrentEtape] = useState(null);
  const [photoPreuve, setPhotoPreuve] = useState(null);
  const [commentairePreuve, setCommentairePreuve] = useState('');
  const [submittingPreuve, setSubmittingPreuve] = useState(false);

  // GPS
  const gpsIntervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [resTournee, resEtapes] = await Promise.all([
        api.get(`/entreprise/livreur/tournees/${id}/`),
        api.get(`/entreprise/livreur/tournees/${id}/commandes/`),
      ]);
      setTournee(resTournee.data);
      setEtapes(Array.isArray(resEtapes.data) ? resEtapes.data : (resEtapes.data.etapes || []));
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de charger la tournée');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Envoi GPS automatique
  const envoyerGPS = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await api.post('/entreprise/livreurs/gps/update/', {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {}
  }, []);

  useEffect(() => {
    if (tournee?.statut === 'en_cours') {
      envoyerGPS();
      gpsIntervalRef.current = setInterval(envoyerGPS, GPS_INTERVAL);
    } else if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    return () => { if (gpsIntervalRef.current) clearInterval(gpsIntervalRef.current); };
  }, [tournee?.statut, envoyerGPS]);

  // Actions Tournée
  const handleTourneeAction = async (statut) => {
    setActionLoading(true);
    try {
      await api.patch(`/entreprise/livreur/tournees/${id}/statut/`, { statut });
      await load();
      if (statut === 'terminee') {
        Alert.alert('✅ Tournée terminée');
        router.replace('/(app)/tournee');
      }
    } catch (e) {
      Alert.alert('Erreur', e.response?.data?.detail || 'Action impossible');
    } finally {
      setActionLoading(false);
    }
  };

  // Appel Téléphone
  const makePhoneCall = (phone) => {
    if (!phone) return;
    const clean = phone.replace(/[\s\-\(\)]/g, '');
    const final = clean.startsWith('+216') ? clean : `+216${clean.replace(/^0/, '')}`;
    Linking.openURL(`tel:${final}`).catch(() => Alert.alert('Erreur', "Impossible d'ouvrir le téléphone"));
  };

  // Navigation
  const handleNaviguer = (etape) => ouvrirNavigation(etape);

  // Preuve Photo
  const prendrePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setPhotoPreuve(result.assets[0]);
  };

  const validerPreuve = async () => {
    if (!photoPreuve || !currentEtape) return;
    setSubmittingPreuve(true);

    const formData = new FormData();
    formData.append('photo_preuve', { uri: photoPreuve.uri, type: 'image/jpeg', name: 'preuve.jpg' });
    if (commentairePreuve) formData.append('commentaire_livreur', commentairePreuve);

    try {
      await api.post(`/entreprise/commandes/${currentEtape.commande}/preuve/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.patch(`/entreprise/commandes/${currentEtape.commande}/statut/`, {
        statut: 'livree',
        commentaire: 'Livré avec preuve photo',
      });
      await load();
      setShowPreuveModal(false);
      setPhotoPreuve(null);
      setCommentairePreuve('');
      Alert.alert('✅ Livraison validée avec preuve');
    } catch {
      Alert.alert('Erreur', "Impossible d'enregistrer la preuve");
    } finally {
      setSubmittingPreuve(false);
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" color="#1e40af" />;

  const estEnCours = tournee?.statut === 'en_cours';
  const estTerminee = tournee?.statut === 'terminee';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{tournee?.reference}</Text>
        <Text style={styles.headerZone}>{tournee?.zone_gouvernorat}</Text>
      </View>

      {/* Boutons Démarrer / Terminer */}
      {!estTerminee && (
        <View style={styles.tourneeActions}>
          {tournee?.statut === 'planifiee' && (
            <TouchableOpacity style={styles.btnDemarrer} onPress={() => handleTourneeAction('en_cours')} disabled={actionLoading}>
              <Text style={styles.btnText}>🚀 Démarrer la tournée</Text>
            </TouchableOpacity>
          )}
          {estEnCours && (
            <TouchableOpacity style={styles.btnTerminer} onPress={() => handleTourneeAction('terminee')} disabled={actionLoading}>
              <Text style={styles.btnText}>🏁 Terminer la tournée</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}>
        {etapes.map((etape) => {
          const estLivree = etape.commande_statut === 'livree';
          const estRetournee = etape.commande_statut === 'retournee';

          return (
            <View key={etape.id} style={[styles.card, estLivree && styles.cardLivree, estRetournee && styles.cardRetournee]}>
              <Text style={styles.ref}>#{etape.ordre} — {etape.commande_reference}</Text>

              <View style={styles.clientRow}>
                <View style={styles.clientInfo}>
                  <Text style={styles.client}>
                    👤 {etape.commande_dest_nom} {etape.commande_dest_prenom || ''}
                  </Text>
                  <Text style={styles.adresse}>
                    📍 {etape.commande_dest_adresse}, {etape.commande_gouvernorat}
                  </Text>
                </View>

                {/* Bouton Appel Téléphone */}
                {etape.commande_dest_telephone && (
                  <TouchableOpacity style={styles.phoneButton} onPress={() => makePhoneCall(etape.commande_dest_telephone)}>
                    <Text style={styles.phoneIcon}>📞</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Bouton Naviguer */}
              {!estTerminee && (
                <TouchableOpacity style={styles.btnNav} onPress={() => handleNaviguer(etape)}>
                  <Text style={styles.btnNavText}>🗺️ Naviguer vers le client</Text>
                </TouchableOpacity>
              )}

              {/* Actions Livraison */}
              {estEnCours && !estLivree && !estRetournee && (
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.btnLivrer} onPress={() => { setCurrentEtape(etape); setShowPreuveModal(true); }}>
                    <Text style={styles.btnLivrerText}>✓ Livré</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnRetour} onPress={() => setRetourTarget(etape)}>
                    <Text style={styles.btnRetourText}>↩ Retour</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* Modal Preuve Photo */}
      <Modal visible={showPreuveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Preuve de Livraison</Text>

            {photoPreuve ? (
              <Image source={{ uri: photoPreuve.uri }} style={styles.photoPreview} />
            ) : (
              <TouchableOpacity style={styles.btnPhoto} onPress={prendrePhoto}>
                <Text style={styles.btnPhotoText}>📸 Prendre photo</Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={styles.textArea}
              placeholder="Commentaire (optionnel)"
              multiline
              value={commentairePreuve}
              onChangeText={setCommentairePreuve}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowPreuveModal(false)}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnConfirm} onPress={validerPreuve} disabled={!photoPreuve || submittingPreuve}>
                <Text style={styles.btnConfirmText}>{submittingPreuve ? 'Envoi...' : 'Valider'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Retour (à compléter avec ta version existante) */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { backgroundColor: '#1e40af', padding: 16, paddingTop: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { color: '#93c5fd', fontSize: 16 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 },
  headerZone: { color: '#bfdbfe', fontSize: 14 },

  tourneeActions: { padding: 12, flexDirection: 'row', gap: 10, backgroundColor: '#fff' },
  btnDemarrer: { flex: 1, backgroundColor: '#10b981', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnTerminer: { flex: 1, backgroundColor: '#ef4444', padding: 14, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  card: { backgroundColor: '#fff', padding: 16, margin: 12, borderRadius: 12, elevation: 3 },
  cardLivree: { borderLeftWidth: 5, borderLeftColor: '#10b981' },
  cardRetournee: { borderLeftWidth: 5, borderLeftColor: '#ef4444' },

  clientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  clientInfo: { flex: 1 },
  client: { fontSize: 16, fontWeight: '600' },
  adresse: { fontSize: 13, color: '#6b7280', marginTop: 4 },

  phoneButton: { backgroundColor: '#10b981', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  phoneIcon: { fontSize: 22, color: '#fff' },

  btnNav: { backgroundColor: '#3b82f6', padding: 12, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  btnNavText: { color: '#fff', fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnLivrer: { flex: 1, backgroundColor: '#10b981', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnLivrerText: { color: '#fff', fontWeight: '700' },
  btnRetour: { flex: 1, backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, alignItems: 'center' },
  btnRetourText: { color: '#ef4444', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  btnPhoto: { backgroundColor: '#1e40af', padding: 14, borderRadius: 10, alignItems: 'center', marginVertical: 10 },
  photoPreview: { width: '100%', height: 220, borderRadius: 12, marginVertical: 10 },
  textArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 80, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12 },
  btnCancel: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  btnCancelText: { color: '#6b7280', fontWeight: '600' },
  btnConfirm: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#10b981', alignItems: 'center' },
  btnConfirmText: { color: '#fff', fontWeight: '700' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});