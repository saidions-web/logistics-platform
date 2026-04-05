from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404

from commandes.models import Commande, StatutCommande
from accounts.models import EntrepriseProfile
from tarif.models import Tarif
from .models import Recommandation
from .serializers import (
    TarifSerializer, TarifCreateSerializer,
    RecommandationSerializer, SelectionManuelleSerializer,
    ScoreEntrepriseSerializer,
)
from .scoring import generer_recommandation, calculer_scores



class TarifListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_entreprise(self, user):
        if user.role != 'entreprise':
            return None
        return getattr(user, 'entreprise_profile', None)

    def get(self, request):
        entreprise = self._get_entreprise(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        tarifs = Tarif.objects.filter(entreprise=entreprise)
        return Response(TarifSerializer(tarifs, many=True).data)

    def post(self, request):
        entreprise = self._get_entreprise(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        serializer = TarifCreateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(entreprise=entreprise)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)


class TarifDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        if request.user.role != 'entreprise':
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        entreprise = getattr(request.user, 'entreprise_profile', None)
        tarif = get_object_or_404(Tarif, pk=pk, entreprise=entreprise)
        tarif.delete()
        return Response({'detail': 'Tarif supprimé.'})


# ─────────────────────────────────────────
# US-12 + US-13 : Générer et afficher la recommandation
# POST /api/recommandation/commandes/<id>/scorer/
# GET  /api/recommandation/commandes/<id>/
# ─────────────────────────────────────────

class ScorerCommandeView(APIView):
    """
    US-12 — Lance l'algorithme de scoring pour une commande.
    Sauvegarde et retourne la recommandation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, commande_id):
        if request.user.role != 'vendeur':
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        commande = get_object_or_404(Commande, pk=commande_id, vendeur=request.user)

        if commande.statut != StatutCommande.EN_ATTENTE:
            return Response(
                {'detail': 'La recommandation n\'est possible que pour les commandes en attente.'},
                status=400
            )

        reco = generer_recommandation(commande)

        if not reco.scores_details:
            return Response(
                {'detail': 'Aucun prestataire disponible pour ce gouvernorat et ce poids.'},
                status=404
            )

        return Response(RecommandationSerializer(reco).data, status=201)


class RecommandationDetailView(APIView):
    """
    US-13 — Consulter la recommandation existante d'une commande.
    """
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
                status=400
            )

        serializer = SelectionManuelleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        entreprise = get_object_or_404(
            EntrepriseProfile, pk=serializer.validated_data['entreprise_id']
        )

        # ✅ sécurité : vérifier éligibilité
        ids_eligibles = [s['entreprise_id'] for s in (reco.scores_details or [])]

        if entreprise.pk not in ids_eligibles:
            return Response(
                {'detail': 'Ce prestataire n\'est pas éligible pour cette commande.'},
                status=400
            )

        reco.entreprise_choisie = entreprise
        reco.selection_manuelle = True
        reco.save()

        # ✅ SYNCHRONISER Commande.entreprise pour que calcul_prix_livraison() fonctionne
        commande.entreprise = entreprise
        # Recalculer le prix de livraison avec la bonne entreprise
        commande.prix_livraison = commande.calcul_prix_livraison()
        commande.save(update_fields=['entreprise', 'prix_livraison'])

        return Response(RecommandationSerializer(reco).data)