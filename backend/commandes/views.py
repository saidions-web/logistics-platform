from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Commande, StatutCommande
from .serializers import (
    CommandeSerializer,
    CommandeCreateSerializer,
    CommandeUpdateSerializer,
)
from recommandation.models import Recommandation


def is_vendeur(user):
    return user.role == 'vendeur'


class CommandeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_vendeur(request.user):
            return Response(
                {'detail': 'Accès réservé aux vendeurs.'},
                status=403
            )

        commandes = Commande.objects.filter(vendeur=request.user)\
            .select_related('vendeur', 'vendeur__vendeur_profile')\
            .prefetch_related('colis', 'historique')

        if statut := request.query_params.get('statut'):
            commandes = commandes.filter(statut=statut)

        if gouvernorat := request.query_params.get('gouvernorat'):
            commandes = commandes.filter(dest_gouvernorat=gouvernorat)

        if search := request.query_params.get('search'):
            commandes = commandes.filter(
                Q(reference__icontains=search) |
                Q(dest_nom__icontains=search) |
                Q(dest_prenom__icontains=search) |
                Q(dest_telephone__icontains=search) |
                Q(dest_gouvernorat__icontains=search)
            )

        commandes = commandes.order_by('-created_at')
        return Response(CommandeSerializer(commandes, many=True).data)

   def post(self, request):
    if not is_vendeur(request.user):
        return Response(
            {'detail': 'Accès réservé aux vendeurs.'},
            status=403
        )

    serializer = CommandeCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    # ✅ CORRECTION SIMPLE :
    # On crée la commande SANS entreprise (null)
    # L'entreprise sera affectée après le scoring
    # via SelectionManuelleView ou generer_recommandation
    commande = serializer.save(vendeur=request.user)

    return Response(
        CommandeSerializer(commande).data,
        status=status.HTTP_201_CREATED
    )

class CommandeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_commande(self, pk, user):
        return get_object_or_404(Commande, pk=pk, vendeur=user)

    def get(self, request, pk):
        if not is_vendeur(request.user):
            return Response(
                {'detail': 'Accès réservé aux vendeurs.'},
                status=403
            )
        commande = Commande.objects\
            .select_related('vendeur', 'vendeur__vendeur_profile')\
            .prefetch_related('colis', 'historique')\
            .get(pk=pk, vendeur=request.user)
        return Response(CommandeSerializer(commande).data)

    def patch(self, request, pk):
        if not is_vendeur(request.user):
            return Response(
                {'detail': 'Accès réservé aux vendeurs.'},
                status=403
            )
        commande = self._get_commande(pk, request.user)
        serializer = CommandeUpdateSerializer(
            commande,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            return Response(CommandeSerializer(serializer.save()).data)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request, pk):
        if not is_vendeur(request.user):
            return Response(
                {'detail': 'Accès réservé aux vendeurs.'},
                status=403
            )
        commande = self._get_commande(pk, request.user)
        if commande.statut != StatutCommande.EN_ATTENTE:
            return Response(
                {
                    'detail': (
                        'Impossible d\'annuler une commande '
                        'déjà prise en charge.'
                    )
                },
                status=400
            )
        commande.statut = StatutCommande.ANNULEE
        commande.save()
        return Response(
            {
                'message': (
                    f'La commande {commande.reference} '
                    f'a été annulée avec succès.'
                )
            },
            status=200
        )


class CommandeSuiviView(APIView):
    permission_classes = []

    def get(self, request, reference):
        commande = get_object_or_404(
            Commande,
            reference=reference.upper()
        )

        historique = []
        for h in commande.historique.all().order_by('-date'):
            historique.append({
                'date': h.date,
                'ancien_statut': h.ancien_statut,
                'nouveau_statut': h.nouveau_statut,
                'commentaire': h.commentaire or '',
            })

        return Response({
            'reference': commande.reference,
            'statut': commande.statut,
            'statut_label': commande.get_statut_display(),
            'type_livraison': commande.type_livraison,
            'dest_nom': commande.dest_nom,
            'dest_prenom': commande.dest_prenom,
            'dest_telephone': commande.dest_telephone,
            'dest_adresse': commande.dest_adresse,
            'dest_gouvernorat': commande.dest_gouvernorat,
            'prix_livraison': str(commande.prix_livraison),
            'montant_a_collecter': str(commande.montant_a_collecter),
            'entreprise': {
                'raison_sociale': commande.entreprise.raison_sociale
            } if commande.entreprise else None,
            'historique': historique,
            'created_at': commande.created_at,
        })