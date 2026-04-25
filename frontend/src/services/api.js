import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post('/api/auth/token/refresh/', { refresh });
        localStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ====================== AUTH ======================
export const authApi = {
  loginVendeur:         (data)  => api.post('/auth/login/', data),
  registerVendeur:      (data)  => api.post('/auth/register/vendeur/', data),
  registerEntreprise:   (data)  => api.post('/auth/register/entreprise/', data),
  verifyEmail:          (token) => api.get(`/auth/verify-email/?token=${token}`),
  resendVerification:   (email) => api.post('/auth/resend-verification/', { email }),
  logout:               (refresh) => api.post('/auth/logout/', { refresh }),
  me:                   ()     => api.get('/auth/me/'),

  // Mot de passe oublié
  forgotPassword: (data) => api.post('/auth/forgot-password/', data),
  resetPassword:  (data) => api.post('/auth/reset-password/', data),

  // Gestion profil
  updateProfile:           (data) => api.patch('/auth/me/', data),
  changePassword:          (data) => api.post('/auth/change-password/', data),
  getVendeurProfile:       ()     => api.get('/auth/me/vendeur/'),
  updateVendeurProfile:    (data) => api.patch('/auth/me/vendeur/', data),
  getEntrepriseProfile:    ()     => api.get('/auth/me/entreprise/'),
  updateEntrepriseProfile: (data) => api.patch('/auth/me/entreprise/', data),
};

// ====================== RECOMMANDATION ======================
export const recommandationApi = {
  getTarifs:    ()           => api.get('/recommandation/tarifs/'),
  addTarif:     (data)       => api.post('/recommandation/tarifs/', data),
  deleteTarif:  (id)         => api.delete(`/recommandation/tarifs/${id}/`),

  scorer:       (cmdId)      => api.post(`/recommandation/commandes/${cmdId}/scorer/`),
  get:          (cmdId)      => api.get(`/recommandation/commandes/${cmdId}/`),
  choisir:      (cmdId, data)=> api.patch(`/recommandation/commandes/${cmdId}/choisir/`, data),
};

// ====================== COMMANDES ======================
export const commandesApi = {
  create: (data)   => api.post('/commandes/', data),
  list:   (params) => api.get('/commandes/', { params }),
  get:    (id)     => api.get(`/commandes/${id}/`),
  update: (id, data) => api.patch(`/commandes/${id}/`, data),
  cancel: (id)     => api.delete(`/commandes/${id}/`),
  suivi:  (ref)    => api.get(`/commandes/suivi/${ref}/`),
};

// ====================== RETOURS ======================
export const retoursApi = {
  list: (params = {}) =>
    api.get('/retours/', { params }),

  decision: (id, data) =>
    api.patch(`/retours/${id}/decision/`, data),

  declarer: (data) =>
    api.post('/retours/declarer/', data),

  reception: (id) =>
    api.patch(`/retours/${id}/reception/`),
};

// ====================== ENTREPRISE API (Corrigé) ======================
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

  getLivreur: (id) =>
    api.get(`/entreprise/livreurs/${id}/`),

  updateLivreur: (id, data) =>
    api.patch(`/entreprise/livreurs/${id}/`, data),

  deleteLivreur: (id) =>
    api.delete(`/entreprise/livreurs/${id}/`),

  // === GPS Positions (US-21) ===
  livreursPositions: (enTournee = false) =>
    api.get('/entreprise/livreurs/positions/', {
      params: { en_tournee: enTournee }
    }),

  updatePosition: (livreurId, data) =>
    api.post(`/entreprise/livreurs/${livreurId}/position/`, data),

  // === TOURNÉES ===
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

  // Affectations d'une tournée
  getTourneeEtapes: (tourneeId) =>
    api.get(`/entreprise/tournees/${tourneeId}/commandes/`),

  ajouterCommande: (tourneeId, data) =>
    api.post(`/entreprise/tournees/${tourneeId}/commandes/`, data),

  retirerCommande: (tourneeId, commandeId) =>
    api.delete(`/entreprise/tournees/${tourneeId}/commandes/`, {
      data: { commande_id: commandeId },
    }),

  // Optimisation & Réordonnement (US-19 & US-20)
  optimiserTournee: (tourneeId) =>
    api.post(`/entreprise/tournees/${tourneeId}/optimiser/`),

  reordonnerTournee: (tourneeId, ordre) =>
    api.patch(`/entreprise/tournees/${tourneeId}/reordonner/`, { ordre }),

  // Affectation automatique (US-18)
  affectationAuto: () =>
    api.post('/entreprise/affectation/auto/'),

  // Tournées du livreur connecté (App Mobile)
  getMesTournees: () =>
    api.get('/entreprise/livreur/tournees/'),
};

// ====================== NOTIFICATIONS ======================
export const notificationApi = {
  list: () => api.get('/notifications/'),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
};

export default api;