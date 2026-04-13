# tournees/urls.py
from django.urls import path
from .views import (
    TourneeListCreateView,
    TourneeDetailView,
    TourneeAffectationsView,
    LivreurTourneeView,
    TourneeOptimiserView,
    TourneeReordonnerView,
    LivreursPositionsView,
    LivreurPositionUpdateView,
    AffectationAutoView,          # ← On ajoute cette ligne
)

app_name = 'tournees'

urlpatterns = [
    path('tournees/', TourneeListCreateView.as_view(), name='tournees-list-create'),
    path('tournees/<int:pk>/', TourneeDetailView.as_view(), name='tournee-detail'),
    path('tournees/<int:pk>/commandes/', TourneeAffectationsView.as_view(), name='tournee-affectations'),

    path('tournees/<int:pk>/optimiser/', TourneeOptimiserView.as_view(), name='tournee-optimiser'),
    path('tournees/<int:pk>/reordonner/', TourneeReordonnerView.as_view(), name='tournee-reordonner'),

    # Affectation automatique - Cette ligne est obligatoire
    path('affectation/auto/', AffectationAutoView.as_view(), name='affectation-auto'),

    path('livreur/tournees/', LivreurTourneeView.as_view(), name='livreur-tournees'),

    path('livreurs/positions/', LivreursPositionsView.as_view(), name='livreurs-positions'),
    path('livreurs/<int:pk>/position/', LivreurPositionUpdateView.as_view(), name='livreur-position-update'),
]