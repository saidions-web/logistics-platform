# backend/entreprise/urls.py
from django.urls import path
from .views import (
    EntrepriseDashboardView,
    EntrepriseCommandesView,
    EntrepriseCommandeStatutView,
    LivreurListCreateView,
    LivreurDetailView,
    EntrepriseRapportView,
    PreuveLivraisonCreateView,
)
from .views_gps import (
    LivreurPositionUpdateView,
    EntrepriseLivreursPositionsView,
)

app_name = 'entreprise'

urlpatterns = [
    # ── Dashboard & Commandes ─────────────────────────────────
    path('dashboard/', EntrepriseDashboardView.as_view(), name='dashboard'),
    path('commandes/', EntrepriseCommandesView.as_view(), name='commandes'),
    path('commandes/<int:pk>/statut/', EntrepriseCommandeStatutView.as_view(), name='commande-statut'),
    path('commandes/<int:commande_id>/preuve/', PreuveLivraisonCreateView.as_view(), name='commande-preuve'),
    path('rapport/', EntrepriseRapportView.as_view(), name='rapport'),

    # ── Livreurs ──────────────────────────────────────────────
    # IMPORTANT : les routes statiques AVANT les routes dynamiques <int:pk>
    path('livreurs/', LivreurListCreateView.as_view(), name='livreurs-list-create'),

    # Route statique "positions" avant la route dynamique "<pk>/position"
    path('livreurs/positions/', EntrepriseLivreursPositionsView.as_view(), name='livreurs-positions'),

    # Routes dynamiques avec pk
    path('livreurs/<int:pk>/', LivreurDetailView.as_view(), name='livreur-detail'),
    path('livreurs/<int:pk>/position/', LivreurPositionUpdateView.as_view(), name='livreur-position-update'),
]