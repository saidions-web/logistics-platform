from django.urls import path
from .views import RetourListView, RetourCreateView, DecisionVendeurView, ReceptionDepotView

urlpatterns = [
    path('',                   RetourListView.as_view()),      # GET  — liste retours
    path('declarer/',          RetourCreateView.as_view()),    # POST — déclarer un retour (entreprise)
    path('<int:pk>/decision/', DecisionVendeurView.as_view()), # PATCH — décision vendeur
    path('<int:pk>/reception/',ReceptionDepotView.as_view()),  # PATCH — reçu au dépôt (entreprise)
]