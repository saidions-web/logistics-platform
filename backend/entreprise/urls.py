# entreprise/urls.py
from django.urls import path
from .views import (
    EntrepriseDashboardView,
    EntrepriseCommandesView,
    EntrepriseCommandeStatutView,
    LivreurListCreateView,
    LivreurDetailView,
)

app_name = 'entreprise'

urlpatterns = [
    # Dashboard & Commandes
    path('dashboard/', EntrepriseDashboardView.as_view(), name='dashboard'),
    path('commandes/', EntrepriseCommandesView.as_view(), name='commandes'),
    path('commandes/<int:pk>/statut/', EntrepriseCommandeStatutView.as_view(), name='commande-statut'),

    # Gestion des livreurs
    path('livreurs/', LivreurListCreateView.as_view(), name='livreurs-list-create'),
    path('livreurs/<int:pk>/', LivreurDetailView.as_view(), name='livreur-detail'),
]