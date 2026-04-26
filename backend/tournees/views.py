from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from collections import defaultdict

from accounts.models import EntrepriseProfile
from commandes.models import Commande, StatutCommande, HistoriqueStatut
from entreprise.models import Livreur
from .models import Tournee, AffectationCommande, StatutTournee
from .serializers import (
    TourneeSerializer, TourneeListSerializer,
    TourneeCreateSerializer, TourneeUpdateSerializer,
    AffectationCreateSerializer, AffectationSerializer,
)


def get_entreprise_or_403(user):
    if user.role != 'entreprise':
        return None
    return getattr(user, 'entreprise_profile', None)


# ─────────────────────────────────────────
# LIVREUR — Voir ses affectations
# ─────────────────────────────────────────

class LivreurTourneeAffectationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.role != 'livreur':
            return Response(
                {'detail': 'Accès réservé aux livreurs.'},
                status=403
            )
        livreur = getattr(request.user, 'livreur_profile', None)
        if not livreur:
            return Response(
                {'detail': 'Profil livreur introuvable.'},
                status=404
            )
        tournee = get_object_or_404(Tournee, pk=pk, livreur=livreur)
        affectations = tournee.affectations\
            .select_related('commande')\
            .order_by('ordre')
        return Response(AffectationSerializer(affectations, many=True).data)


# ─────────────────────────────────────────
# LIVREUR — Voir le détail d'une tournée
# ─────────────────────────────────────────

class LivreurTourneeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.role != 'livreur':
            return Response(
                {'detail': 'Accès réservé aux livreurs.'},
                status=403
            )
        livreur = getattr(request.user, 'livreur_profile', None)
        if not livreur:
            return Response(
                {'detail': 'Profil livreur introuvable.'},
                status=404
            )
        tournee = get_object_or_404(Tournee, pk=pk, livreur=livreur)
        return Response(TourneeSerializer(tournee).data)


# ─────────────────────────────────────────
# ENTREPRISE — Liste & Création de tournées
# ─────────────────────────────────────────

class TourneeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response(
                {'detail': 'Accès réservé aux entreprises.'},
                status=403
            )
        tournees = Tournee.objects.filter(entreprise=entreprise)

        statut = request.query_params.get('statut')
        if statut:
            tournees = tournees.filter(statut=statut)

        livreur_id = request.query_params.get('livreur')
        if livreur_id:
            tournees = tournees.filter(livreur_id=livreur_id)

        return Response(TourneeListSerializer(tournees, many=True).data)

    def post(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response(
                {'detail': 'Accès réservé aux entreprises.'},
                status=403
            )
        serializer = TourneeCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        livreur = serializer.validated_data.get('livreur')
        if livreur and livreur.entreprise != entreprise:
            return Response(
                {'detail': 'Ce livreur n\'appartient pas à votre entreprise.'},
                status=400
            )

        tournee = serializer.save(entreprise=entreprise)
        return Response(TourneeSerializer(tournee).data, status=201)


# ─────────────────────────────────────────
# ENTREPRISE + LIVREUR — Détail d'une tournée
# ─────────────────────────────────────────

class TourneeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        if request.user.role == 'livreur':
            livreur = getattr(request.user, 'livreur_profile', None)
            if livreur:
                tournee = get_object_or_404(
                    Tournee, pk=pk, livreur=livreur
                )
                return Response(TourneeSerializer(tournee).data)

        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response(
                {'detail': 'Accès réservé aux entreprises.'},
                status=403
            )
        tournee = get_object_or_404(
            Tournee, pk=pk, entreprise=entreprise
        )
        return Response(TourneeSerializer(tournee).data)

    def patch(self, request, pk):
        # ── Récupérer la tournée selon le rôle ──
        if request.user.role == 'livreur':
            livreur = getattr(request.user, 'livreur_profile', None)
            if not livreur:
                return Response(
                    {'detail': 'Profil livreur introuvable.'},
                    status=404
                )
            tournee = get_object_or_404(
                Tournee, pk=pk, livreur=livreur
            )
        else:
            entreprise = get_entreprise_or_403(request.user)
            if not entreprise:
                return Response(
                    {'detail': 'Accès réservé aux entreprises.'},
                    status=403
                )
            tournee = get_object_or_404(
                Tournee, pk=pk, entreprise=entreprise
            )

        if tournee.statut == StatutTournee.TERMINEE:
            return Response(
                {'detail': 'Impossible de modifier une tournée terminée.'},
                status=400
            )

        serializer = TourneeUpdateSerializer(
            tournee, data=request.data, partial=True
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        tournee = serializer.save()

        # ─────────────────────────────────────────
        # ENTREPRISE — tournée planifiée
        # → commandes : en_attente → prise_charge
        # ─────────────────────────────────────────
        if (
            tournee.statut == StatutTournee.PLANIFIEE
            and request.user.role == 'entreprise'
        ):
            for affectation in tournee.affectations\
                    .select_related('commande').all():
                commande = affectation.commande
                if commande.statut == StatutCommande.EN_ATTENTE:
                    ancien = commande.statut
                    commande.statut = StatutCommande.PRISE_CHARGE
                    commande.save()
                    HistoriqueStatut.objects.create(
                        commande=commande,
                        ancien_statut=ancien,
                        nouveau_statut=StatutCommande.PRISE_CHARGE,
                        commentaire=(
                            f'Prise en charge — '
                            f'Tournée {tournee.reference}'
                        ),
                    )

        # ─────────────────────────────────────────
        # LIVREUR démarre la tournée
        # → commandes : prise_charge → en_transit
        # → livreur   : disponible  → en_tournee
        # ─────────────────────────────────────────
        if (
            tournee.statut == StatutTournee.EN_COURS
            and request.user.role == 'livreur'
        ):
            if tournee.livreur:
                tournee.livreur.statut = 'en_tournee'
                tournee.livreur.save()

            for affectation in tournee.affectations\
                    .select_related('commande').all():
                commande = affectation.commande
                if commande.statut == StatutCommande.PRISE_CHARGE:
                    ancien = commande.statut
                    commande.statut = StatutCommande.EN_TRANSIT
                    commande.save()
                    HistoriqueStatut.objects.create(
                        commande=commande,
                        ancien_statut=ancien,
                        nouveau_statut=StatutCommande.EN_TRANSIT,
                        commentaire=(
                            f'Livreur en route — '
                            f'Tournée {tournee.reference} démarrée'
                        ),
                    )

        # ─────────────────────────────────────────
        # TOURNÉE TERMINÉE
        # → NE PAS marquer les commandes livrées auto
        # → Libérer le livreur si plus de tournée active
        # ─────────────────────────────────────────
        if tournee.statut == StatutTournee.TERMINEE:
            if tournee.livreur:
                autres_en_cours = Tournee.objects.filter(
                    livreur=tournee.livreur,
                    statut=StatutTournee.EN_COURS,
                ).exclude(pk=tournee.pk).exists()

                if not autres_en_cours:
                    tournee.livreur.statut = 'disponible'
                    tournee.livreur.save()

        return Response(TourneeSerializer(tournee).data)


# ─────────────────────────────────────────
# US-18 — Affectation automatique
# ─────────────────────────────────────────

class AffectationAutoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response(
                {'detail': 'Accès réservé aux entreprises.'},
                status=403
            )

        commandes = list(Commande.objects.filter(
            entreprise=entreprise,
            statut=StatutCommande.EN_ATTENTE,
        ).exclude(
            affectations__tournee__statut__in=[
                StatutTournee.PLANIFIEE,
                StatutTournee.EN_COURS,
            ]
        ))

        if not commandes:
            return Response({
                'detail': 'Aucune commande en attente.',
                'affectees': 0,
            })

        livreurs = list(Livreur.objects.filter(
            entreprise=entreprise,
            statut='disponible',
        ))

        if not livreurs:
            return Response(
                {'detail': 'Aucun livreur disponible.'},
                status=400
            )

        affectees  = 0
        assignments = []

        with transaction.atomic():
            groupes = defaultdict(list)
            for cmd in commandes:
                groupes[cmd.dest_gouvernorat].append(cmd)

            for gov, cmds_groupe in groupes.items():
                meilleur_livreur = None
                meilleur_score   = float('inf')

                for livreur in livreurs:
                    charge = AffectationCommande.objects.filter(
                        tournee__livreur=livreur,
                        tournee__statut__in=[
                            StatutTournee.PLANIFIEE,
                            StatutTournee.EN_COURS,
                        ]
                    ).count()

                    score = charge * 2
                    if (
                        livreur.gouvernorats_couverts
                        and gov not in livreur.gouvernorats_couverts
                    ):
                        score += 15

                    if score < meilleur_score:
                        meilleur_score   = score
                        meilleur_livreur = livreur

                if not meilleur_livreur:
                    continue

                today = timezone.now().date()
                tournee, _ = Tournee.objects.get_or_create(
                    livreur=meilleur_livreur,
                    entreprise=entreprise,
                    date_prevue=today,
                    statut=StatutTournee.PLANIFIEE,
                    defaults={'zone_gouvernorat': gov}
                )

                for i, cmd in enumerate(cmds_groupe):
                    ordre = AffectationCommande.objects.filter(
                        tournee=tournee
                    ).count() + i + 1

                    AffectationCommande.objects.create(
                        tournee=tournee,
                        commande=cmd,
                        ordre=ordre,
                    )

                    # ✅ Affectation auto = entreprise
                    # → prise_charge (pas en_transit)
                    ancien     = cmd.statut
                    cmd.statut = StatutCommande.PRISE_CHARGE
                    cmd.save()

                    HistoriqueStatut.objects.create(
                        commande=cmd,
                        ancien_statut=ancien,
                        nouveau_statut=StatutCommande.PRISE_CHARGE,
                        commentaire=(
                            f'Affecté automatiquement à '
                            f'{meilleur_livreur.nom_complet} '
                            f'(zone {gov})'
                        ),
                    )

                    affectees += 1
                    assignments.append(
                        f'{cmd.reference} → '
                        f'{meilleur_livreur.nom_complet}'
                    )

        return Response({
            'detail': (
                f'{affectees} commande(s) affectée(s) '
                f'avec regroupement par zone.'
            ),
            'affectees':   affectees,
            'assignments': assignments[:10],
        })


# ─────────────────────────────────────────
# ENTREPRISE — Commandes d'une tournée
# ─────────────────────────────────────────

class TourneeAffectationsView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_tournee(self, pk, entreprise):
        return get_object_or_404(
            Tournee, pk=pk, entreprise=entreprise
        )

    def get(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response(
                {'detail': 'Accès réservé aux entreprises.'},
                status=403
            )
        tournee      = self._get_tournee(pk, entreprise)
        affectations = tournee.affectations\
            .select_related('commande')\
            .order_by('ordre')
        return Response(
            AffectationSerializer(affectations, many=True).data
        )

    def post(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response(
                {'detail': 'Accès réservé aux entreprises.'},
                status=403
            )

        tournee = self._get_tournee(pk, entreprise)

        if tournee.statut == StatutTournee.TERMINEE:
            return Response(
                {
                    'detail': (
                        'Impossible d\'ajouter une commande '
                        'à une tournée terminée.'
                    )
                },
                status=400
            )

        serializer = AffectationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        commande_id = serializer.validated_data['commande_id']
        commande    = get_object_or_404(
            Commande, pk=commande_id, entreprise=entreprise
        )

        if AffectationCommande.objects.filter(
            tournee=tournee, commande=commande
        ).exists():
            return Response(
                {'detail': 'Cette commande est déjà dans la tournée.'},
                status=400
            )

        if AffectationCommande.objects.filter(
            commande=commande,
            tournee__statut__in=[
                StatutTournee.PLANIFIEE,
                StatutTournee.EN_COURS,
            ]
        ).exists():
            return Response(
                {
                    'detail': (
                        'Cette commande est déjà affectée '
                        'à une autre tournée active.'
                    )
                },
                status=400
            )

        ordre = AffectationCommande.objects.filter(
            tournee=tournee
        ).count() + 1

        affectation = AffectationCommande.objects.create(
            tournee=tournee,
            commande=commande,
            ordre=ordre,
            notes=serializer.validated_data.get('notes', ''),
        )

        # ✅ Statut selon l'état de la tournée
        if commande.statut == StatutCommande.EN_ATTENTE:
            if tournee.statut == StatutTournee.PLANIFIEE:
                nouveau_statut = StatutCommande.PRISE_CHARGE
                commentaire    = (
                    f'Affectée à la tournée {tournee.reference}'
                )
            elif tournee.statut == StatutTournee.EN_COURS:
                nouveau_statut = StatutCommande.EN_TRANSIT
                commentaire    = (
                    f'Affectée à la tournée {tournee.reference} '
                    f'en cours'
                )
            else:
                nouveau_statut = None
                commentaire    = None

            if nouveau_statut:
                ancien          = commande.statut
                commande.statut = nouveau_statut
                commande.save()
                HistoriqueStatut.objects.create(
                    commande=commande,
                    ancien_statut=ancien,
                    nouveau_statut=nouveau_statut,
                    commentaire=commentaire,
                )

        return Response(
            AffectationSerializer(affectation).data,
            status=201
        )


# ─────────────────────────────────────────
# LIVREUR — Ses tournées actives
# ─────────────────────────────────────────

class LivreurTourneeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'livreur':
            return Response(
                {'detail': 'Accès réservé aux livreurs.'},
                status=403
            )
        livreur = getattr(request.user, 'livreur_profile', None)
        if not livreur:
            return Response(
                {'detail': 'Profil livreur introuvable.'},
                status=404
            )
        tournees = Tournee.objects.filter(
            livreur=livreur,
            statut__in=[
                StatutTournee.PLANIFIEE,
                StatutTournee.EN_COURS,
            ]
        ).prefetch_related('affectations__commande')\
         .order_by('date_prevue')

        return Response(TourneeSerializer(tournees, many=True).data)


# ─────────────────────────────────────────
# US-19 — Optimisation de tournée
# ─────────────────────────────────────────

class TourneeOptimiserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response(
                {'detail': 'Accès réservé aux entreprises.'},
                status=403
            )

        tournee = get_object_or_404(
            Tournee, pk=pk, entreprise=entreprise
        )

        if tournee.statut == StatutTournee.TERMINEE:
            return Response(
                {'detail': 'Impossible d\'optimiser une tournée terminée.'},
                status=400
            )

        etapes = list(
            AffectationCommande.objects
            .filter(tournee=tournee)
            .select_related('commande')
        )

        if len(etapes) < 2:
            return Response(
                {'detail': 'Pas assez d\'étapes pour optimiser.'},
                status=400
            )

        def get_coords(cmd):
            lat = getattr(cmd, 'dest_latitude',  None)
            lng = getattr(cmd, 'dest_longitude', None)
            if lat is None or lng is None:
                return None
            return (float(lat), float(lng))

        def distance(c1, c2):
            if c1 is None or c2 is None:
                return float('inf')
            return ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2) ** 0.5

        groupes      = defaultdict(list)
        route_finale = []

        for etape in etapes:
            gov = etape.commande.dest_gouvernorat or 'Inconnu'
            groupes[gov].append(etape)

        for gov, liste_groupe in groupes.items():
            if not liste_groupe:
                continue

            start = max(
                liste_groupe,
                key=lambda e: (
                    get_coords(e.commande)[0]
                    if get_coords(e.commande) else 0
                )
            )

            non_visitees = [e for e in liste_groupe if e != start]
            route_groupe = [start]

            while non_visitees:
                current    = get_coords(route_groupe[-1].commande)
                next_etape = min(
                    non_visitees,
                    key=lambda e: distance(
                        current, get_coords(e.commande)
                    )
                )
                route_groupe.append(next_etape)
                non_visitees.remove(next_etape)

            route_finale.extend(route_groupe)

        with transaction.atomic():
            for i, etape in enumerate(route_finale, start=1):
                etape.ordre = i
                etape.save()

        return Response({
            'detail': (
                f'Tournée {tournee.reference} optimisée '
                f'avec calcul de distance'
            ),
            'etapes': [
                {
                    'id':                   e.id,
                    'ordre':                i + 1,
                    'commande_reference':   e.commande.reference,
                    'commande_dest_nom':    e.commande.dest_nom,
                    'commande_gouvernorat': e.commande.dest_gouvernorat,
                    'commande_dest_adresse':
                        getattr(e.commande, 'dest_adresse', ''),
                }
                for i, e in enumerate(route_finale)
            ]
        })


# ─────────────────────────────────────────
# US-20 — Réordonnement manuel
# ─────────────────────────────────────────

class TourneeReordonnerView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response(
                {'detail': 'Accès réservé aux entreprises.'},
                status=403
            )

        tournee = get_object_or_404(
            Tournee, pk=pk, entreprise=entreprise
        )

        if tournee.statut == StatutTournee.TERMINEE:
            return Response(
                {'detail': 'Impossible de modifier une tournée terminée.'},
                status=400
            )

        ordre_ids = request.data.get('ordre', [])
        if not ordre_ids:
            return Response(
                {'detail': 'Le champ ordre est requis.'},
                status=400
            )

        etapes        = AffectationCommande.objects.filter(tournee=tournee)
        ids_existants = set(etapes.values_list('id', flat=True))

        try:
            ordre_ids = [int(i) for i in ordre_ids]
        except ValueError:
            return Response(
                {'detail': 'Les IDs doivent être des nombres.'},
                status=400
            )

        if set(ordre_ids) != ids_existants:
            return Response(
                {
                    'detail': (
                        'Les IDs ne correspondent pas '
                        'aux étapes de cette tournée.'
                    )
                },
                status=400
            )

        with transaction.atomic():
            for position, etape_id in enumerate(ordre_ids, start=1):
                AffectationCommande.objects.filter(
                    pk=etape_id, tournee=tournee
                ).update(ordre=position)

        etapes_maj = AffectationCommande.objects\
            .filter(tournee=tournee)\
            .select_related('commande')\
            .order_by('ordre')

        return Response({
            'detail': 'Ordre mis à jour avec succès.',
            'etapes': AffectationSerializer(etapes_maj, many=True).data,
        })


# ─────────────────────────────────────────
# US-21 — Positions GPS des livreurs
# ─────────────────────────────────────────

class LivreursPositionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response(
                {'detail': 'Accès réservé aux entreprises.'},
                status=403
            )

        livreurs = Livreur.objects.filter(entreprise=entreprise)

        if request.query_params.get('en_tournee') == 'true':
            livreurs = livreurs.filter(statut='en_tournee')

        data = []
        for l in livreurs:
            nb_commandes = AffectationCommande.objects.filter(
                tournee__livreur=l,
                tournee__statut=StatutTournee.EN_COURS,
            ).count()

            tournee_active = Tournee.objects.filter(
                livreur=l,
                statut=StatutTournee.EN_COURS,
            ).first()

            data.append({
                'id':                    l.id,
                'nom_complet':           l.nom_complet,
                'telephone':             l.telephone,
                'statut':                l.statut,
                'vehicule':              l.type_vehicule,
                'latitude':              l.latitude,
                'longitude':             l.longitude,
                'derniere_maj':          l.derniere_position,
                'nb_commandes_en_cours': nb_commandes,
                'tournee_reference': (
                    tournee_active.reference
                    if tournee_active else None
                ),
                'tournee_id': (
                    tournee_active.id
                    if tournee_active else None
                ),
            })

        return Response(data)


# ─────────────────────────────────────────
# US-21 — Mise à jour position GPS livreur
# ─────────────────────────────────────────

class LivreurPositionUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        livreur = get_object_or_404(Livreur, pk=pk)

        if request.user.role == 'livreur':
            if getattr(request.user, 'livreur_profile', None) != livreur:
                return Response(
                    {'detail': 'Accès réservé à votre propre profil.'},
                    status=403
                )
        elif request.user.role == 'entreprise':
            entreprise = get_entreprise_or_403(request.user)
            if not entreprise or livreur.entreprise != entreprise:
                return Response(
                    {
                        'detail': (
                            'Accès réservé aux livreurs '
                            'de votre entreprise.'
                        )
                    },
                    status=403
                )
        else:
            return Response(
                {'detail': 'Accès non autorisé.'},
                status=403
            )

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')

        if lat is None or lng is None:
            return Response(
                {'detail': 'latitude et longitude sont requis.'},
                status=400
            )

        livreur.latitude          = float(lat)
        livreur.longitude         = float(lng)
        livreur.derniere_position = timezone.now()
        livreur.save(update_fields=[
            'latitude', 'longitude', 'derniere_position'
        ])

        return Response({
            'detail':    'Position mise à jour.',
            'latitude':  lat,
            'longitude': lng,
        })