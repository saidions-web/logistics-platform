from django.urls import path
from .views import (
    TourneeListCreateView,
    TourneeDetailView,
    TourneeAffectationsView,
    LivreurTourneeView,
    TourneeOptimiserView,
    TourneeReordonnerView,
    LivreurPositionUpdateView,
    AffectationAutoView,
    LivreurTourneeDetailView,
    LivreurTourneeAffectationsView,
)
from entreprise.views_tournee import LivreurTourneeStatutView   # ✅ import manquant

app_name = 'tournees'

urlpatterns = [
    # Tournées entreprise
    path('',                        TourneeListCreateView.as_view(),       name='tournees-list-create'),
    path('<int:pk>/',               TourneeDetailView.as_view(),           name='tournee-detail'),
    path('<int:pk>/commandes/',     TourneeAffectationsView.as_view(),     name='tournee-affectations'),
    path('<int:pk>/optimiser/',     TourneeOptimiserView.as_view(),        name='tournee-optimiser'),
    path('<int:pk>/reordonner/',    TourneeReordonnerView.as_view(),       name='tournee-reordonner'),

    # Affectation automatique
    path('affectation/auto/',       AffectationAutoView.as_view(),         name='affectation-auto'),

    # Tournées livreur (mobile)
    path('livreur/tournees/',                    LivreurTourneeView.as_view(),               name='livreur-tournees'),
    path('livreur/tournees/<int:pk>/',           LivreurTourneeDetailView.as_view(),         name='livreur-tournee-detail'),
    path('livreur/tournees/<int:pk>/statut/',    LivreurTourneeStatutView.as_view(),         name='livreur-tournee-statut'),   # ✅ route manquante
    path('livreur/tournees/<int:pk>/commandes/', LivreurTourneeAffectationsView.as_view(),   name='livreur-tournee-commandes'),

    # GPS
    path('livreurs/<int:pk>/position/',          LivreurPositionUpdateView.as_view(),        name='livreur-position-update'),
]