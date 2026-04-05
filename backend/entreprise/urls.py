from django.urls import path
from .views import (
    EntrepriseDashboardView,
    EntrepriseCommandesView,
    EntrepriseCommandeStatutView,
    LivreurListCreateView,
    LivreurDetailView,
    TourneeListCreateView,
    TourneeDetailView,
    TourneeAffectationsView,
    LivreurTourneeView,
)
from .views_us18_21 import (
    AffectationAutoView,
    TourneeOptimiserView,
    TourneeReordonnerView,
    LivreursPositionsView,
    LivreurPositionUpdateView,
)

urlpatterns = [
    path('dashboard/',                         EntrepriseDashboardView.as_view()),
    path('commandes/',                         EntrepriseCommandesView.as_view()),
    path('commandes/<int:pk>/statut/',         EntrepriseCommandeStatutView.as_view()),

    # ⚠️ positions/ et livreur/ AVANT <int:pk>/ — ordre critique
    path('livreurs/',                          LivreurListCreateView.as_view()),
    path('livreurs/positions/',                LivreursPositionsView.as_view()),
    path('livreurs/<int:pk>/',                 LivreurDetailView.as_view()),
    path('livreurs/<int:pk>/position/',        LivreurPositionUpdateView.as_view()),

    path('affectation/auto/',                  AffectationAutoView.as_view()),

    path('tournees/',                          TourneeListCreateView.as_view()),
    path('tournees/<int:pk>/',                 TourneeDetailView.as_view()),
    path('tournees/<int:pk>/commandes/',       TourneeAffectationsView.as_view()),
    path('tournees/<int:pk>/optimiser/',       TourneeOptimiserView.as_view()),
    path('tournees/<int:pk>/reordonner/',      TourneeReordonnerView.as_view()),

    # App mobile livreur
    path('livreur/tournees/',                  LivreurTourneeView.as_view()),
]