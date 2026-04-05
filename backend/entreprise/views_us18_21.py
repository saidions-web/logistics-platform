from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from .models import Livreur, Tournee, AffectationCommande, StatutLivreur, StatutTournee
from .serializers import TourneeSerializer, AffectationSerializer
from commandes.models import Commande, StatutCommande, HistoriqueStatut


def get_entreprise_or_403(user):
    if user.role != 'entreprise':
        return None
    return getattr(user, 'entreprise_profile', None)


# ═══════════════════════════════════════════════════════════════
# US-18 — Affectation automatique
# POST /api/entreprise/affectation/auto/
# ═══════════════════════════════════════════════════════════════

class AffectationAutoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        from recommandation.models import Recommandation
        from django.utils import timezone

        reco_ids = Recommandation.objects.filter(
            entreprise_choisie=entreprise
        ).values_list('commande_id', flat=True)

        # Commandes en attente sans affectation dans une tournée
        commandes = Commande.objects.filter(
            id__in=reco_ids,
            statut=StatutCommande.EN_ATTENTE,
        ).exclude(
            affectations__tournee__statut__in=[StatutTournee.PLANIFIEE, StatutTournee.EN_COURS]
        ).distinct()

        if not commandes.exists():
            return Response({'detail': 'Aucune commande en attente à affecter.', 'affectees': 0})

        livreurs = Livreur.objects.filter(
            entreprise=entreprise,
            statut=StatutLivreur.DISPONIBLE
        )

        if not livreurs.exists():
            return Response({'detail': 'Aucun livreur disponible.', 'affectees': 0}, status=400)

        affectees, non_affectees = [], []

        with transaction.atomic():
            for commande in commandes:
                gouvernorat = commande.dest_gouvernorat
                livreur_cible = None
                min_charge = float('inf')

                for livreur in livreurs:
                    zones = livreur.gouvernorats_couverts or []
                    if gouvernorat in zones:
                        charge = AffectationCommande.objects.filter(
                            tournee__livreur=livreur,
                            tournee__statut__in=[StatutTournee.PLANIFIEE, StatutTournee.EN_COURS]
                        ).count()
                        if charge < min_charge:
                            min_charge = charge
                            livreur_cible = livreur

                if not livreur_cible:
                    non_affectees.append(commande.reference)
                    continue

                today = timezone.now().date()
                tournee, _ = Tournee.objects.get_or_create(
                    livreur=livreur_cible,
                    entreprise=entreprise,
                    date_prevue=today,
                    statut=StatutTournee.PLANIFIEE,
                    defaults={'zone_gouvernorat': gouvernorat}
                )

                ordre = AffectationCommande.objects.filter(tournee=tournee).count() + 1
                AffectationCommande.objects.create(tournee=tournee, commande=commande, ordre=ordre)

                ancien = commande.statut
                commande.statut = StatutCommande.PRISE_CHARGE
                commande.save()
                HistoriqueStatut.objects.create(
                    commande=commande,
                    ancien_statut=ancien,
                    nouveau_statut=StatutCommande.PRISE_CHARGE,
                    commentaire=f'Affectation automatique → {livreur_cible.nom_complet}',
                )
                affectees.append({
                    'commande': commande.reference,
                    'livreur':  livreur_cible.nom_complet,
                    'tournee':  tournee.reference,
                })

        return Response({
            'affectees':             len(affectees),
            'non_affectees':         len(non_affectees),
            'detail_affectees':      affectees,
            'detail_non_affectees':  non_affectees,
        })


# ═══════════════════════════════════════════════════════════════
# US-19 — Optimisation automatique de l'ordre d'une tournée
# POST /api/entreprise/tournees/<pk>/optimiser/
# ═══════════════════════════════════════════════════════════════

class TourneeOptimiserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        tournee = get_object_or_404(Tournee, pk=pk, entreprise=entreprise)

        if tournee.statut == StatutTournee.TERMINEE:
            return Response({'detail': 'Impossible d\'optimiser une tournée terminée.'}, status=400)

        etapes = list(
            AffectationCommande.objects
            .filter(tournee=tournee)
            .select_related('commande')
        )

        if len(etapes) < 2:
            return Response({'detail': 'Pas assez d\'étapes pour optimiser.'})

        # ─────────────────────────────────────────
        # 🔥 TRI INTELLIGENT (Nearest Neighbor)
        # ─────────────────────────────────────────

        def get_coords(cmd):
            return (
                getattr(cmd, 'dest_latitude', None),
                getattr(cmd, 'dest_longitude', None)
            )

        def distance(c1, c2):
            if None in c1 or None in c2:
                return float('inf')
            return ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2) ** 0.5

        non_visitees = etapes[:]
        route = []

        # point de départ = première commande
        current = non_visitees.pop(0)
        route.append(current)

        while non_visitees:
            current_coords = get_coords(current.commande)

            prochain = min(
                non_visitees,
                key=lambda e: distance(current_coords, get_coords(e.commande))
            )

            non_visitees.remove(prochain)
            route.append(prochain)
            current = prochain

        # fallback si pas de GPS
        if all(get_coords(e.commande) == (None, None) for e in etapes):
            route = sorted(
                etapes,
                key=lambda e: (
                    e.commande.dest_gouvernorat or '',
                    e.commande.dest_adresse or '',
                    e.commande.id
                )
            )

        # ─────────────────────────────────────────
        # 💾 SAUVEGARDE
        # ─────────────────────────────────────────
        with transaction.atomic():
            for i, etape in enumerate(route, start=1):
                etape.ordre = i
                etape.save()

        # ─────────────────────────────────────────
        # 📦 RESPONSE PROPRE POUR FRONT
        # ─────────────────────────────────────────
        return Response({
            'detail': f'Tournée {tournee.reference} optimisée',
            'etapes': [
                {
                    'id': e.id,
                    'ordre': i + 1,
                    'commande_reference': e.commande.reference,
                    'commande_dest_nom': e.commande.dest_nom,
                    'commande_dest_prenom': e.commande.dest_prenom,
                    'commande_gouvernorat': e.commande.dest_gouvernorat,
                    'commande_adresse': e.commande.dest_adresse,
                    'commande_telephone': e.commande.dest_telephone,
                }
                for i, e in enumerate(route)
            ]
        })

# ═══════════════════════════════════════════════════════════════
# US-20 — Ajustement manuel de l'ordre d'une tournée
# PATCH /api/entreprise/tournees/<pk>/reordonner/
# Body: { "ordre": [id_affectation_1, id_affectation_2, ...] }
# ═══════════════════════════════════════════════════════════════

class TourneeReordonnerView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        tournee = get_object_or_404(Tournee, pk=pk, entreprise=entreprise)

        if tournee.statut == StatutTournee.TERMINEE:
            return Response({'detail': 'Impossible de modifier une tournée terminée.'}, status=400)

        ordre_ids = request.data.get('ordre', [])
        if not ordre_ids:
            return Response({'detail': 'Le champ ordre est requis.'}, status=400)

        etapes = AffectationCommande.objects.filter(tournee=tournee)
        ids_existants = set(etapes.values_list('id', flat=True))

        if set(int(i) for i in ordre_ids) != ids_existants:
            return Response(
                {'detail': 'Les IDs ne correspondent pas aux étapes de cette tournée.'},
                status=400
            )

        with transaction.atomic():
            for position, etape_id in enumerate(ordre_ids, start=1):
                AffectationCommande.objects.filter(pk=etape_id, tournee=tournee).update(ordre=position)

        etapes_maj = AffectationCommande.objects.filter(
            tournee=tournee
        ).select_related('commande').order_by('ordre')

        return Response({
            'detail': 'Ordre mis à jour avec succès.',
            'etapes': AffectationSerializer(etapes_maj, many=True).data
        })


# ═══════════════════════════════════════════════════════════════
# US-21 — Positions GPS des livreurs
# GET  /api/entreprise/livreurs/positions/
# POST /api/entreprise/livreurs/<pk>/position/
# ═══════════════════════════════════════════════════════════════

class LivreursPositionsView(APIView):
    """Positions en temps réel de tous les livreurs en tournée."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        livreurs = Livreur.objects.filter(entreprise=entreprise)

        # Filtre optionnel : seulement ceux en tournée
        en_tournee = request.query_params.get('en_tournee')
        if en_tournee == 'true':
            livreurs = livreurs.filter(statut=StatutLivreur.EN_TOURNEE)

        data = []
        for l in livreurs:
            nb_commandes = AffectationCommande.objects.filter(
                tournee__livreur=l,
                tournee__statut=StatutTournee.EN_COURS
            ).count()

            # Tournée active
            tournee_active = Tournee.objects.filter(
                livreur=l,
                statut=StatutTournee.EN_COURS
            ).first()

            data.append({
                'id':                    l.id,
                'nom_complet':           l.nom_complet,
                'telephone':             l.telephone,
                'statut':                l.statut,
                'vehicule':              l.type_vehicule,
                'latitude':              getattr(l, 'latitude', None),
                'longitude':             getattr(l, 'longitude', None),
                'derniere_maj':          getattr(l, 'derniere_position', None),
                'nb_commandes_en_cours': nb_commandes,
                'tournee_reference':     tournee_active.reference if tournee_active else None,
                'tournee_id':            tournee_active.id if tournee_active else None,
            })

        return Response(data)


class LivreurPositionUpdateView(APIView):
    """Le livreur met à jour sa position GPS via l'app mobile."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        livreur = get_object_or_404(Livreur, pk=pk)

        if request.user.role not in ['livreur', 'entreprise']:
            return Response({'detail': 'Accès non autorisé.'}, status=403)

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')

        if lat is None or lng is None:
            return Response({'detail': 'latitude et longitude sont requis.'}, status=400)

        from django.utils import timezone
        livreur.latitude         = float(lat)
        livreur.longitude        = float(lng)
        livreur.derniere_position = timezone.now()
        livreur.save(update_fields=['latitude', 'longitude', 'derniere_position'])

        return Response({'detail': 'Position mise à jour.', 'latitude': lat, 'longitude': lng})