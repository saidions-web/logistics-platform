// ✅ On importe l'instance axios configurée (avec intercepteur JWT)
//    au lieu du axios brut — c'est ce qui causait le 401.
//    Adapte le chemin si ton fichier s'appelle autrement (axiosInstance, http, etc.)
import api from "./api";

const API_URL = "/notifications/";

// ─── Liste des notifications de l'utilisateur connecté ───
const getNotifications = () => {
  return api.get(API_URL);
};

// ─── Nombre de notifications non lues (badge) ───
const getUnreadCount = () => {
  return api.get(`${API_URL}unread-count/`);
};

// ─── Marquer une notification comme lue ───
const markAsRead = (id) => {
  return api.post(`${API_URL}${id}/read/`);
};

// ─── Marquer toutes les notifications comme lues ───
const markAllAsRead = () => {
  return api.post(`${API_URL}read-all/`);
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};