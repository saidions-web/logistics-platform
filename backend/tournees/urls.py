# backend/tournees/urls.py — VERSION CORRIGÉE
#
# SUPPRESSION de la route livreurs/positions/ ici.
# Elle est définie dans entreprise/urls.py → views_tournee.EntrepriseLivreursPositionsView
# Garder les deux causait une collision silencieuse où Django prenait
# la première correspondance selon l'ordre d'inclusion dans logistique/urls.py.

from django.urls import path
from .views import (
    TourneeListCreateView,
    TourneeDetailView,
    TourneeAffectationsView,
    LivreurTourneeView,
    TourneeOptimiserView,
    TourneeReordonnerView,
    LivreurPositionUpdateView,   # ✅ Gardé — endpoint d'ÉCRITURE de position
    AffectationAutoView,
    LivreurTourneeDetailView,
    LivreurTourneeAffectationsView,
    # ❌ LivreursPositionsView supprimé d'ici
    #    → Utilisé via entreprise/urls.py (EntrepriseLivreursPositionsView)
)

app_name = 'tournees'

urlpatterns = [
    # Tournées entreprise
     path('',                        TourneeListCreateView.as_view(),       name='tournees-list-create'),
    path('<int:pk>/',               TourneeDetailView.as_view(),           name='tournee-detail'),
    path('<int:pk>/commandes/',     TourneeAffectationsView.as_view(),     name='tournee-affectations'),
    path('<int:pk>/optimiser/',     TourneeOptimiserView.as_view(),        name='tournee-optimiser'),
    path('<int:pk>/reordonner/',    TourneeReordonnerView.as_view(),       name='tournee-reordonner'),

    # Affectation automatique
    path('affectation/auto/',                AffectationAutoView.as_view(),         name='affectation-auto'),

    # Tournées livreur (mobile)
    path('livreur/tournees/',                LivreurTourneeView.as_view(),          name='livreur-tournees'),
    path('livreur/tournees/<int:pk>/',       LivreurTourneeDetailView.as_view(),    name='livreur-tournee-detail'),
    path('livreur/tournees/<int:pk>/commandes/', LivreurTourneeAffectationsView.as_view(), name='livreur-tournee-commandes'),

    # ✅ ÉCRITURE position GPS (livreur → backend)
    path('livreurs/<int:pk>/position/',      LivreurPositionUpdateView.as_view(),   name='livreur-position-update'),

    # ❌ SUPPRIMÉ : path('livreurs/positions/', ...) → conflit avec entreprise/urls.py
    #    La LECTURE des positions pour l'entreprise se fait via :
    #    GET /api/entreprise/livreurs/positions/ → EntrepriseLivreursPositionsView
]