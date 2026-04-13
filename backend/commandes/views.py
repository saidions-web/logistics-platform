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
    CommandeUpdateSerializer
)

from recommandation.models import Recommandation
from accounts.models import EntrepriseProfile


def is_vendeur(user):
    return user.role == 'vendeur'


# ══════════════════════════════════════════════════
# US-06 + US-07 : Créer / Lister commandes
# ══════════════════════════════════════════════════

class CommandeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        commandes = Commande.objects.filter(vendeur=request.user).prefetch_related('colis', 'historique')

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
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        serializer = CommandeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Assignation entreprise via recommandation
        recommandation = Recommandation.objects.filter(
            commande__vendeur=request.user,
            entreprise_choisie__isnull=False
        ).order_by('-created_at').first()

        entreprise = recommandation.entreprise_choisie if recommandation else None

        if not entreprise:
            entreprise = EntrepriseProfile.objects.filter(is_active=True).first()

        if not entreprise:
            return Response({'detail': 'Aucune entreprise disponible pour cette commande.'}, status=400)

        commande = serializer.save(vendeur=request.user, entreprise=entreprise)
        return Response(CommandeSerializer(commande).data, status=status.HTTP_201_CREATED)


# ══════════════════════════════════════════════════
# Détail, Modification, Suppression
# ══════════════════════════════════════════════════

class CommandeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_commande(self, pk, user):
        return get_object_or_404(Commande, pk=pk, vendeur=user)

    def get(self, request, pk):
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)
        commande = self._get_commande(pk, request.user)
        return Response(CommandeSerializer(commande).data)

    def patch(self, request, pk):
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)
        commande = self._get_commande(pk, request.user)
        serializer = CommandeUpdateSerializer(commande, data=request.data, partial=True)
        if serializer.is_valid():
            return Response(CommandeSerializer(serializer.save()).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)
        commande = self._get_commande(pk, request.user)
        if commande.statut != StatutCommande.EN_ATTENTE:
            return Response({'detail': 'Impossible d\'annuler une commande déjà prise en charge.'}, status=400)
        commande.statut = StatutCommande.ANNULEE
        commande.save()
        return Response({'detail': 'Commande annulée avec succès.'})


# ══════════════════════════════════════════════════
# SUIVI PUBLIC - VERSION CORRIGÉE (IMPORTANT)
# ══════════════════════════════════════════════════

class CommandeSuiviView(APIView):
    permission_classes = []   # Accès public

    def get(self, request, reference):
        commande = get_object_or_404(Commande, reference=reference.upper())

        # Historique bien formaté
        historique = []
        for h in commande.historique.all().order_by('-date'):
            historique.append({
                'date': h.date,
                'ancien_statut': h.ancien_statut,
                'nouveau_statut': h.nouveau_statut,
                'statut_label': commande.get_statut_display() if h.nouveau_statut == commande.statut else h.nouveau_statut,
                'commentaire': h.commentaire or '',
            })

        return Response({
            'reference': commande.reference,
            'statut': commande.statut,
            'statut_label': commande.get_statut_display(),
            'type_livraison': commande.type_livraison,
            
            # Champs corrigés pour le Tracking
            'dest_nom': commande.dest_nom,
            'dest_prenom': commande.dest_prenom,
            'dest_telephone': commande.dest_telephone,
            'dest_adresse': commande.dest_adresse,
            'dest_gouvernorat': commande.dest_gouvernorat,
            
            'prix_livraison': str(commande.prix_livraison),
            'montant_a_collecter': str(commande.montant_a_collecter),

            # Entreprise
            'entreprise': {
                'raison_sociale': commande.entreprise.raison_sociale if commande.entreprise else None,
            } if commande.entreprise else None,

            'historique': historique,
            'created_at': commande.created_at,
        })