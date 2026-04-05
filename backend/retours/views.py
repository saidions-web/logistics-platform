from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from commandes.models import Commande, StatutCommande, HistoriqueStatut
from notifications.models import Notification
from .models import RetourCommande, StatutRetour
from .serializers import (
    RetourCommandeSerializer,
    DecisionVendeurSerializer,
    RetourCreateSerializer,
)


# ─────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────

def get_entreprise_or_403(user):
    if user.role != 'entreprise':
        return None
    return getattr(user, 'entreprise_profile', None)


# ═══════════════════════════════════════════════════════
# ENTREPRISE — Déclarer un retour
# POST /api/retours/
# Body : { commande_id, motif, commentaire }
# ═══════════════════════════════════════════════════════

class RetourCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        serializer = RetourCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        from recommandation.models import Recommandation

        # Vérifier que la commande appartient à cette entreprise
        reco_ids = Recommandation.objects.filter(
            entreprise_choisie=entreprise
        ).values_list('commande_id', flat=True)

        commande = get_object_or_404(
            Commande,
            pk=serializer.validated_data['commande_id'],
            id__in=reco_ids
        )

        # La commande doit être en transit ou prise en charge
        if commande.statut not in [StatutCommande.EN_TRANSIT, StatutCommande.PRISE_CHARGE]:
            return Response(
                {'detail': f'Impossible de déclarer un retour depuis le statut "{commande.statut}".'},
                status=400
            )

        # Éviter les doublons
        if RetourCommande.objects.filter(commande=commande).exists():
            return Response({'detail': 'Un retour existe déjà pour cette commande.'}, status=400)

        # Changer le statut de la commande
        ancien_statut   = commande.statut
        commande.statut = StatutCommande.RETOURNEE
        commande.save()

        HistoriqueStatut.objects.create(
            commande=commande,
            ancien_statut=ancien_statut,
            nouveau_statut=StatutCommande.RETOURNEE,
            commentaire=f"Retour — {serializer.validated_data['motif']} : {serializer.validated_data.get('commentaire', '')}",
        )

        # Créer l'enregistrement de retour
        retour = RetourCommande.objects.create(
            commande=commande,
            motif=serializer.validated_data['motif'],
            commentaire=serializer.validated_data.get('commentaire', ''),
        )

        # Notifier le vendeur
        Notification.objects.create(
            utilisateur=commande.vendeur,
            titre="Commande retournée",
            message=(
                f"Votre commande {commande.reference} a été retournée "
                f"({retour.get_motif_display()}). "
                f"Veuillez choisir une action dans votre espace."
            )
        )

        return Response(RetourCommandeSerializer(retour).data, status=201)


# ═══════════════════════════════════════════════════════
# VENDEUR — Liste de ses retours
# GET /api/retours/
# ═══════════════════════════════════════════════════════

class RetourListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role == 'vendeur':
            retours = RetourCommande.objects.filter(
                commande__vendeur=request.user
            ).select_related('commande', 'commande__vendeur')

        elif request.user.role == 'entreprise':
            entreprise = get_object_or_404(
                type(request.user.entreprise_profile),
                user=request.user
            )
            from recommandation.models import Recommandation
            reco_ids = Recommandation.objects.filter(
                entreprise_choisie=entreprise
            ).values_list('commande_id', flat=True)
            retours = RetourCommande.objects.filter(
                commande_id__in=reco_ids
            ).select_related('commande', 'commande__vendeur')

        else:
            return Response({'detail': 'Accès non autorisé.'}, status=403)

        # Filtre optionnel par statut
        statut = request.query_params.get('statut')
        if statut:
            retours = retours.filter(statut=statut)

        return Response(RetourCommandeSerializer(retours, many=True).data)


# ═══════════════════════════════════════════════════════
# VENDEUR — Prendre une décision sur un retour
# PATCH /api/retours/<id>/decision/
# Body : { decision: "reprogrammer"|"annuler", notes_vendeur }
# ═══════════════════════════════════════════════════════

class DecisionVendeurView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != 'vendeur':
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        retour = get_object_or_404(
            RetourCommande,
            pk=pk,
            commande__vendeur=request.user
        )

        if retour.decision_vendeur:
            return Response({'detail': 'Une décision a déjà été prise pour ce retour.'}, status=400)

        serializer = DecisionVendeurSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        decision     = serializer.validated_data['decision']
        notes_vendeur = serializer.validated_data.get('notes_vendeur', '')

        retour.decision_vendeur = decision
        retour.notes_vendeur    = notes_vendeur
        retour.date_decision    = timezone.now()

        if decision == 'reprogrammer':
            retour.statut = StatutRetour.REPROGRAMME
            # Remettre la commande en attente pour une nouvelle livraison
            commande = retour.commande
            ancien   = commande.statut
            commande.statut = StatutCommande.EN_ATTENTE
            commande.save()
            HistoriqueStatut.objects.create(
                commande=commande,
                ancien_statut=ancien,
                nouveau_statut=StatutCommande.EN_ATTENTE,
                commentaire=f'Reprogrammé par le vendeur — {notes_vendeur}',
            )

        elif decision == 'annuler':
            retour.statut = StatutRetour.ANNULE_FINAL
            commande = retour.commande
            ancien   = commande.statut
            commande.statut = StatutCommande.ANNULEE
            commande.save()
            HistoriqueStatut.objects.create(
                commande=commande,
                ancien_statut=ancien,
                nouveau_statut=StatutCommande.ANNULEE,
                commentaire=f'Annulé définitivement par le vendeur — {notes_vendeur}',
            )

        retour.save()

        # Notifier l'entreprise de la décision
        try:
            from recommandation.models import Recommandation
            reco = retour.commande.recommandation
            if reco and reco.entreprise_choisie:
                label = 'Reprogrammée' if decision == 'reprogrammer' else 'Annulée définitivement'
                Notification.objects.create(
                    utilisateur=reco.entreprise_choisie.user,
                    titre=f"Décision vendeur — {label}",
                    message=f"Commande {retour.commande.reference} : {label} par le vendeur."
                )
        except Exception:
            pass

        return Response(RetourCommandeSerializer(retour).data)


# ═══════════════════════════════════════════════════════
# ENTREPRISE — Marquer le retour comme reçu au dépôt
# PATCH /api/retours/<id>/reception/
# ═══════════════════════════════════════════════════════

class ReceptionDepotView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        retour = get_object_or_404(RetourCommande, pk=pk)

        if retour.statut != StatutRetour.EN_COURS:
            return Response({'detail': 'Ce retour ne peut plus être mis à jour.'}, status=400)

        retour.statut = StatutRetour.RECU_DEPOT
        retour.save()

        return Response(RetourCommandeSerializer(retour).data)