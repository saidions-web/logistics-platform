import axios from 'axios'
 
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})
 
// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
 
// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const { data } = await axios.post('/api/auth/token/refresh/', { refresh })
        localStorage.setItem('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
 
export const authApi = {
  loginVendeur:         (data)  => api.post('/auth/login/', data),
  registerVendeur:      (data)  => api.post('/auth/register/vendeur/', data),
  registerEntreprise:   (data)  => api.post('/auth/register/entreprise/', data),
  verifyEmail:          (token) => api.get(`/auth/verify-email/?token=${token}`),
  resendVerification:   (email) => api.post('/auth/resend-verification/', { email }),
  logout:               (refresh) => api.post('/auth/logout/', { refresh }),
  me:                   ()     => api.get('/auth/me/'),
 
  // ── Mot de passe oublié ──────────────────
  forgotPassword: (data) => api.post('/auth/forgot-password/', data),
  resetPassword:  (data) => api.post('/auth/reset-password/', data),
 
  // ── Gestion profil (US-04) ───────────────
  updateProfile:           (data) => api.patch('/auth/me/', data),
  changePassword:          (data) => api.post('/auth/change-password/', data),
  getVendeurProfile:       ()     => api.get('/auth/me/vendeur/'),
  updateVendeurProfile:    (data) => api.patch('/auth/me/vendeur/', data),
  getEntrepriseProfile:    ()     => api.get('/auth/me/entreprise/'),
  updateEntrepriseProfile: (data) => api.patch('/auth/me/entreprise/', data),
}
 
export const recommandationApi = {
  // Grille tarifaire (entreprise)
  getTarifs:    ()           => api.get('/recommandation/tarifs/'),
  addTarif:     (data)       => api.post('/recommandation/tarifs/', data),
  deleteTarif:  (id)         => api.delete(`/recommandation/tarifs/${id}/`),
 
  // Scoring et recommandation (vendeur)
  scorer:       (cmdId)      => api.post(`/recommandation/commandes/${cmdId}/scorer/`),
  get:          (cmdId)      => api.get(`/recommandation/commandes/${cmdId}/`),
  choisir:      (cmdId, data)=> api.patch(`/recommandation/commandes/${cmdId}/choisir/`, data),
}
 
export const commandesApi = {
  // US-06 : Créer une commande
  create: (data)   => api.post('/commandes/', data),
 
  // US-07 : Lister ses commandes (avec filtres optionnels)
  list:   (params) => api.get('/commandes/', { params }),
 
  // US-07 : Détail d'une commande
  get:    (id)     => api.get(`/commandes/${id}/`),
 
  // US-08 : Modifier une commande
  update: (id, data) => api.patch(`/commandes/${id}/`, data),
 
  // US-09 : Annuler une commande
  cancel: (id)     => api.delete(`/commandes/${id}/`),
 
  // US-10 : Suivi public par référence (pas de token requis)
  suivi:  (ref)    => api.get(`/commandes/suivi/${ref}/`),
}

// ── Sprint 4 — Entreprise ────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// À AJOUTER dans api.js, remplace l'objet entrepriseApi existant
// ─────────────────────────────────────────────────────────────

 
export const retoursApi = {
  // Vendeur — liste de ses retours
  list: (params = {}) =>
    api.get('/retours/', { params }),
 
  // Vendeur — décision sur un retour
  decision: (id, data) =>
    api.patch(`/retours/${id}/decision/`, data),
 
  // Entreprise — déclarer un retour
  declarer: (data) =>
    api.post('/retours/declarer/', data),
 
  // Entreprise — marquer reçu au dépôt
  reception: (id) =>
    api.patch(`/retours/${id}/reception/`),
}
export const entrepriseApi = {
  // Dashboard
  dashboard: () =>
    api.get('/entreprise/dashboard/'),

  // Commandes reçues
  commandes: (params = {}) =>
    api.get('/entreprise/commandes/', { params }),

  changerStatut: (id, data) =>
    api.patch(`/entreprise/commandes/${id}/statut/`, data),

  // Livreurs
  livreurs: (params = {}) =>
    api.get('/entreprise/livreurs/', { params }),

  createLivreur: (data) =>
    api.post('/entreprise/livreurs/', data),

  updateLivreur: (id, data) =>
    api.patch(`/entreprise/livreurs/${id}/`, data),

  deleteLivreur: (id) =>
    api.delete(`/entreprise/livreurs/${id}/`),

  // Positions GPS (US-21)
  livreursPositions: (params = {}) =>
    api.get('/entreprise/livreurs/positions/', { params }),       // ✅ ajouté

  updatePosition: (id, data) =>
    api.post(`/entreprise/livreurs/${id}/position/`, data),       // ✅ ajouté

  // Tournées
  tournees: (params = {}) =>
    api.get('/entreprise/tournees/', { params }),

  getTournee: (id) =>
    api.get(`/entreprise/tournees/${id}/`),

  createTournee: (data) =>
    api.post('/entreprise/tournees/', data),

  updateTournee: (id, data) =>
    api.patch(`/entreprise/tournees/${id}/`, data),

  deleteTournee: (id) =>
    api.delete(`/entreprise/tournees/${id}/`),

  // Étapes d'une tournée (US-19/20)
  getTourneeEtapes: (id) =>
    api.get(`/entreprise/tournees/${id}/commandes/`),             // ✅ ajouté

  ajouterCommande: (tourneeId, data) =>
    api.post(`/entreprise/tournees/${tourneeId}/commandes/`, data),

  retirerCommande: (tourneeId, commandeId) =>
    api.delete(`/entreprise/tournees/${tourneeId}/commandes/`, {
      data: { commande_id: commandeId },
    }),

  // Optimisation tournée (US-19)
  optimiserTournee: (id) =>
    api.post(`/entreprise/tournees/${id}/optimiser/`),            // ✅ ajouté

  // Réordonnement manuel (US-20)
  reordonnerTournee: (id, ordre) =>
    api.patch(`/entreprise/tournees/${id}/reordonner/`, { ordre }),// ✅ ajouté

  // Affectation automatique (US-18)
  affectationAuto: () =>
    api.post('/entreprise/affectation/auto/'),                    // ✅ ajouté

  updateTarif: (id, data) =>
    api.patch(`/recommandation/tarifs/${id}/`, data),
}
export const notificationApi = {
  list: () => api.get('/notifications/'),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
    markAllRead: ()   => api.post('/notifications/read-all/'),   // ✅ ajouter

}

export default api