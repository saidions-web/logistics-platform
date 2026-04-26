from django.urls import path
from .views import (
    ScorerCommandeView,
    RecommandationDetailView,
    SelectionManuelleView,
)

urlpatterns = [
    # Scoring et recommandation (Vendeur)
    path('commandes/<int:commande_id>/scorer/',  ScorerCommandeView.as_view()),       # POST  US-12
    path('commandes/<int:commande_id>/',         RecommandationDetailView.as_view()), # GET   US-13
    path('commandes/<int:commande_id>/choisir/', SelectionManuelleView.as_view()),    # PATCH US-14
]