# backend/entreprise/urls.py
from django.urls import path
from .views import (
    EntrepriseDashboardView,
    EntrepriseCommandesView,
    EntrepriseCommandeStatutView,
    LivreurListCreateView,
    LivreurDetailView,
    EntrepriseRapportView,
)

# Import des vues GPS (correction du nom)
from .views_gps import (
    LivreurPositionUpdateView,      # ← Nom correct
    EntrepriseLivreursPositionsView,
)

app_name = 'entreprise'

urlpatterns = [
    # Dashboard & Commandes
    path('dashboard/', EntrepriseDashboardView.as_view(), name='dashboard'),
    path('commandes/', EntrepriseCommandesView.as_view(), name='commandes'),
    path('commandes/<int:pk>/statut/', EntrepriseCommandeStatutView.as_view(), name='commande-statut'),
    path('rapport/', EntrepriseRapportView.as_view(), name='rapport'),
    # Gestion des livreurs
    path('livreurs/', LivreurListCreateView.as_view(), name='livreurs-list-create'),
    path('livreurs/<int:pk>/', LivreurDetailView.as_view(), name='livreur-detail'),

    # GPS - Positions des livreurs
    path('livreurs/positions/', EntrepriseLivreursPositionsView.as_view(), name='livreurs-positions'),
    path('livreurs/<int:pk>/position/', LivreurPositionUpdateView.as_view(), name='livreur-position-update'),
]