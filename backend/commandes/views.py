from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import Commande, StatutCommande
from .serializers import CommandeSerializer, CommandeCreateSerializer, CommandeUpdateSerializer


def is_vendeur(user):
    return user.role == 'vendeur'


# ══════════════════════════════════════════════════
# US-06 + US-07 : Créer / Lister commandes
# GET  /api/commandes/
# POST /api/commandes/
# ══════════════════════════════════════════════════

class CommandeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """US-07 — Liste avec filtres."""
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        commandes = Commande.objects.filter(vendeur=request.user).prefetch_related('colis', 'historique')

        # Filtre statut
        statut = request.query_params.get('statut')
        if statut:
            commandes = commandes.filter(statut=statut)

        # Filtre gouvernorat
        gouvernorat = request.query_params.get('gouvernorat')
        if gouvernorat:
            commandes = commandes.filter(dest_gouvernorat=gouvernorat)

        # ✅ BUG 6 : filtre search manquant dans l'ancienne version
        search = request.query_params.get('search')
        if search:
            commandes = commandes.filter(
                Q(reference__icontains=search)        |
                Q(dest_nom__icontains=search)          |
                Q(dest_prenom__icontains=search)       |
                Q(dest_telephone__icontains=search)    |
                Q(dest_gouvernorat__icontains=search)  |
                Q(reference_interne__icontains=search)
            )

        commandes = commandes.order_by('-created_at')
        return Response(CommandeSerializer(commandes, many=True).data)

    def post(self, request):
        """US-06 — Créer une commande."""
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        serializer = CommandeCreateSerializer(data=request.data)
        if serializer.is_valid():
            commande = serializer.save(vendeur=request.user)
            return Response(CommandeSerializer(commande).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ══════════════════════════════════════════════════
# US-07 / US-08 / US-09 : Détail / Modifier / Annuler
# GET    /api/commandes/<id>/
# PATCH  /api/commandes/<id>/
# DELETE /api/commandes/<id>/
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
        """US-08 — Modifier (seulement si en_attente)."""
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)
        commande   = self._get_commande(pk, request.user)
        serializer = CommandeUpdateSerializer(commande, data=request.data, partial=True)
        if serializer.is_valid():
            return Response(CommandeSerializer(serializer.save()).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """US-09 — Annuler (seulement si en_attente)."""
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)
        commande = self._get_commande(pk, request.user)
        if commande.statut != StatutCommande.EN_ATTENTE:
            return Response(
                {'detail': 'Impossible d\'annuler une commande déjà prise en charge.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        commande.statut = StatutCommande.ANNULEE
        commande.save()
        return Response({'detail': 'Commande annulée avec succès.'})


# ══════════════════════════════════════════════════
# US-10 : Suivi public par référence
# GET /api/commandes/suivi/<reference>/
# ══════════════════════════════════════════════════

class CommandeSuiviView(APIView):
    permission_classes = []   # accès public

    def get(self, request, reference):
        commande = get_object_or_404(Commande, reference=reference.upper())
        return Response({
            'reference':        commande.reference,
            'statut':           commande.statut,
            'statut_label':     commande.get_statut_display(),
            'type_livraison':   commande.type_livraison,
            'dest_gouvernorat': commande.dest_gouvernorat,
            'historique': [
                {
                    'statut':      h.nouveau_statut,
                    'commentaire': h.commentaire,
                    'date':        h.date,
                }
                for h in commande.historique.all()
            ],
        })