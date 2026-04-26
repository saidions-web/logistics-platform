# entreprise/urls.py

from django.urls import path

from .views import (
    EntrepriseDashboardView,
    EntrepriseCommandesView,
    EntrepriseCommandeStatutView,
    LivreurListCreateView,
    LivreurDetailView,
    PreuveLivraisonCreateView,
    EntrepriseRapportView
)

from .views_gps import (
    LivreurGPSUpdateView,
    EtapeNavigationView,
)

from .views_tournee import (
    LivreurTourneeStatutView,
    EntrepriseLivreursPositionsView,
)

# Note : LivreurTourneeDetailView est dans views_gps.py ou views_tournee.py ?
# D'après ton code précédent, elle est dans views_gps.py, mais l'import échoue.
# On va l'importer correctement depuis le bon endroit.

# Si elle est dans views_gps.py, assure-toi qu'elle y est définie.
# Sinon, déplace-la ou importe depuis le bon fichier.

app_name = 'entreprise'

urlpatterns = [
    # Dashboard & Commandes
    path('dashboard/',                          EntrepriseDashboardView.as_view(),      name='dashboard'),
    path('commandes/',                          EntrepriseCommandesView.as_view(),      name='commandes'),
    path('commandes/<int:pk>/statut/',          EntrepriseCommandeStatutView.as_view(), name='commande-statut'),
    path('commandes/<int:commande_id>/preuve/', PreuveLivraisonCreateView.as_view(),    name='commande-preuve'),

    # Gestion des livreurs (entreprise)
    path('livreurs/',          LivreurListCreateView.as_view(), name='livreurs-list-create'),
    path('livreurs/<int:pk>/', LivreurDetailView.as_view(),     name='livreur-detail'),

    # GPS & Navigation (Mobile Livreur)
    path('livreurs/gps/update/',                         LivreurGPSUpdateView.as_view(),    name='livreur-gps-update'),
    path('livreur/navigation/<int:affectation_id>/',     EtapeNavigationView.as_view(),     name='livreur-navigation'),
    path('rapport/', EntrepriseRapportView.as_view(), name='rapport'),

    # Tournées du livreur
    path('livreur/tournees/<int:pk>/statut/',            LivreurTourneeStatutView.as_view(), name='livreur-tournee-statut'),
    
    # Positions GPS pour l'entreprise (Suivi en temps réel)
    path('livreurs/positions/', EntrepriseLivreursPositionsView.as_view(), name='livreurs-positions'),
]

# Si LivreurTourneeDetailView est dans views_gps.py, ajoute-la ici :
# from .views_gps import LivreurTourneeDetailView
# puis ajoute la route :
# path('livreur/tournees/<int:pk>/', LivreurTourneeDetailView.as_view(), name='livreur-tournee-detail'),