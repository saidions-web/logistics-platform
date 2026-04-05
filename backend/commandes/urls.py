from django.urls import path
from .views import (
    CommandeListCreateView,
    CommandeDetailView,
    CommandeSuiviView,
)

urlpatterns = [
    # Liste + Création
    path('',              CommandeListCreateView.as_view()),  # GET / POST

    # Détail + Modification + Annulation
    path('<int:pk>/',     CommandeDetailView.as_view()),      # GET / PATCH / DELETE

    # Suivi public par référence
    path('suivi/<str:reference>/', CommandeSuiviView.as_view()),  # GET
]