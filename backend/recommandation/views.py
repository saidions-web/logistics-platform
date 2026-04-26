from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from commandes.models import Commande, StatutCommande
from accounts.models import EntrepriseProfile
from .models import Recommandation
from .serializers import (
    RecommandationSerializer,
    SelectionManuelleSerializer,
    ScoreEntrepriseSerializer,
)
from .scoring import generer_recommandation, calculer_scores


# ─────────────────────────────────────────
# US-12 : Générer la recommandation
# POST /api/recommandation/commandes/<id>/scorer/
# ─────────────────────────────────────────

class ScorerCommandeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, commande_id):
        if request.user.role != 'vendeur':
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        commande = get_object_or_404(Commande, pk=commande_id, vendeur=request.user)

        if commande.statut != StatutCommande.EN_ATTENTE:
            return Response(
                {'detail': "La recommandation n'est possible que pour les commandes en attente."},
                status=400,
            )

        reco = generer_recommandation(commande)

        if not reco.scores_details:
            return Response(
                {'detail': 'Aucun prestataire disponible pour ce gouvernorat et ce poids.'},
                status=404,
            )

        return Response(RecommandationSerializer(reco).data, status=201)


# ─────────────────────────────────────────
# US-13 : Consulter la recommandation
# GET /api/recommandation/commandes/<id>/
# ─────────────────────────────────────────

class RecommandationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, commande_id):
        if request.user.role != 'vendeur':
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        commande = get_object_or_404(Commande, pk=commande_id, vendeur=request.user)
        reco = get_object_or_404(Recommandation, commande=commande)
        return Response(RecommandationSerializer(reco).data)


# ─────────────────────────────────────────
# US-14 : Sélection manuelle du prestataire
# PATCH /api/recommandation/commandes/<id>/choisir/
# ─────────────────────────────────────────

class SelectionManuelleView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, commande_id):
        if request.user.role != 'vendeur':
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        commande = get_object_or_404(Commande, pk=commande_id, vendeur=request.user)
        reco     = get_object_or_404(Recommandation, commande=commande)

        if commande.statut != StatutCommande.EN_ATTENTE:
            return Response(
                {'detail': 'Impossible de changer le prestataire après prise en charge.'},
                status=400,
            )

        serializer = SelectionManuelleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        entreprise = get_object_or_404(
            EntrepriseProfile, pk=serializer.validated_data['entreprise_id']
        )

        ids_eligibles = [s['entreprise_id'] for s in (reco.scores_details or [])]
        if entreprise.pk not in ids_eligibles:
            return Response(
                {"detail": "Ce prestataire n'est pas éligible pour cette commande."},
                status=400,
            )

        reco.entreprise_choisie = entreprise
        reco.selection_manuelle = True
        reco.save()

        commande.entreprise     = entreprise
        commande.prix_livraison = commande.calcul_prix_livraison()
        commande.save(update_fields=['entreprise', 'prix_livraison'])

        return Response(RecommandationSerializer(reco).data)