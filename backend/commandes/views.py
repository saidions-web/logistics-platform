# backend/commandes/views.py

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


class CommandeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

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
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        serializer = CommandeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        commande = serializer.save(vendeur=request.user)
        return Response(CommandeSerializer(commande).data, status=status.HTTP_201_CREATED)


class CommandeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_commande(self, pk, user):
        return get_object_or_404(Commande, pk=pk, vendeur=user)

    def get(self, request, pk):
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)
        commande = Commande.objects.select_related('vendeur', 'vendeur__vendeur_profile')\
            .prefetch_related('colis', 'historique').get(pk=pk, vendeur=request.user)
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
            return Response(
                {'detail': 'Impossible d\'annuler une commande déjà prise en charge.'},
                status=400
            )
        commande.statut = StatutCommande.ANNULEE
        commande.save()
        return Response(
            {"message": f"La commande {commande.reference} a été annulée avec succès."},
            status=200
        )


class CommandeSuiviView(APIView):
    permission_classes = []

    def get(self, request, reference):
        commande = get_object_or_404(Commande, reference=reference.upper())

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
            'dest_nom': commande.dest_nom,
            'dest_prenom': commande.dest_prenom,
            'dest_telephone': commande.dest_telephone,
            'dest_adresse': commande.dest_adresse,
            'dest_gouvernorat': commande.dest_gouvernorat,
            'prix_livraison': str(commande.prix_livraison),
            'montant_a_collecter': str(commande.montant_a_collecter),
            'entreprise': {
                'raison_sociale': commande.entreprise.raison_sociale if commande.entreprise else None,
            } if commande.entreprise else None,
            'historique': historique,
            'created_at': commande.created_at,
        })
# backend/commandes/views.py — ajouter cette vue à la fin du fichier

class VendeurRapportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_vendeur(request.user):
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        from django.db.models import Count, Sum, Q
        from django.utils import timezone
        from datetime import timedelta
        import calendar

        commandes = Commande.objects.filter(vendeur=request.user)

        # ── KPI globaux ──────────────────────────────────────────
        total      = commandes.count()
        livrees    = commandes.filter(statut='livree').count()
        retournees = commandes.filter(statut='retournee').count()
        annulees   = commandes.filter(statut='annulee').count()
        en_attente = commandes.filter(statut='en_attente').count()
        en_transit = commandes.filter(
            statut__in=['prise_charge', 'en_transit']
        ).count()

        taux_reussite = round(livrees / total * 100, 1) if total > 0 else 0
        taux_retour   = round(retournees / total * 100, 1) if total > 0 else 0

        montant_collecte = commandes.filter(
            statut='livree'
        ).aggregate(
            total=Sum('montant_a_collecter')
        )['total'] or 0

        montant_perdu = commandes.filter(
            statut='retournee'                    # uniquement les commandes retournées
        ).aggregate(
            total=Sum('prix_livraison')           # ← CHANGEMENT ICI
        )['total'] or 0
        # ── Évolution mensuelle sur 6 mois ───────────────────────
        aujourd_hui = timezone.now()
        evolution_mensuelle = []
        for i in range(2, -1, -1):
            mois_cible = aujourd_hui - timedelta(days=i * 30)
            annee = mois_cible.year
            mois  = mois_cible.month
            qs = commandes.filter(
                created_at__year=annee,
                created_at__month=mois
            )
            evolution_mensuelle.append({
                'mois':       f"{calendar.month_abbr[mois]} {annee}",
                'total':      qs.count(),
                'livrees':    qs.filter(statut='livree').count(),
                'retournees': qs.filter(statut='retournee').count(),
                'annulees':   qs.filter(statut='annulee').count(),
                'montant':    float(
                    qs.filter(statut='livree').aggregate(
                        s=Sum('montant_a_collecter')
                    )['s'] or 0
                ),
            })

        # ── Répartition par gouvernorat ──────────────────────────
        par_gouvernorat = list(
            commandes.values('dest_gouvernorat')
            .annotate(
                total=Count('id'),
                livrees=Count('id', filter=Q(statut='livree')),
            )
            .order_by('-total')[:8]
        )

        # ── Répartition par type de livraison ────────────────────
        par_type = list(
            commandes.values('type_livraison')
            .annotate(total=Count('id'))
            .order_by('-total')
        )

        # ── Top 5 gouvernorats en retour ─────────────────────────
        top_retours = list(
            commandes.filter(statut='retournee')
            .values('dest_gouvernorat')
            .annotate(total=Count('id'))
            .order_by('-total')[:5]
        )

        # ── Commandes récentes (7 derniers jours) ────────────────
        il_y_a_7j = aujourd_hui - timedelta(days=7)
        recentes_count = commandes.filter(created_at__gte=il_y_a_7j).count()

        return Response({
            'kpi': {
                'total':            total,
                'livrees':          livrees,
                'retournees':       retournees,
                'annulees':         annulees,
                'en_attente':       en_attente,
                'en_transit':       en_transit,
                'taux_reussite':    taux_reussite,
                'taux_retour':      taux_retour,
                'montant_collecte': float(montant_collecte),
                'montant_perdu':    float(montant_perdu),
                'recentes_7j':      recentes_count,
            },
            'evolution_mensuelle': evolution_mensuelle,
            'par_gouvernorat':     par_gouvernorat,
            'par_type':            par_type,
            'top_retours':         top_retours,
        })