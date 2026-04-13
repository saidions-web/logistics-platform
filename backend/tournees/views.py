from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone

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
# TOURNÉES ENTREPRISE - Liste & Création
# ─────────────────────────────────────────

class TourneeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

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
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        serializer = TourneeCreateSerializer(data=request.data)
        if serializer.is_valid():
            livreur = serializer.validated_data.get('livreur')
            if livreur and livreur.entreprise != entreprise:
                return Response({'detail': 'Ce livreur n\'appartient pas à votre entreprise.'}, status=400)
            tournee = serializer.save(entreprise=entreprise)
            return Response(TourneeSerializer(tournee).data, status=201)
        return Response(serializer.errors, status=400)


# ─────────────────────────────────────────
# DÉTAIL TOURNÉE
# ─────────────────────────────────────────

class TourneeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_tournee(self, pk, entreprise):
        return get_object_or_404(Tournee, pk=pk, entreprise=entreprise)

    def get(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        tournee = self._get_tournee(pk, entreprise)
        return Response(TourneeSerializer(tournee).data)

    def patch(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        tournee = self._get_tournee(pk, entreprise)

        if tournee.statut == StatutTournee.TERMINEE:
            return Response({'detail': 'Impossible de modifier une tournée terminée.'}, status=400)

        serializer = TourneeUpdateSerializer(tournee, data=request.data, partial=True)
        if serializer.is_valid():
            livreur = serializer.validated_data.get('livreur')
            if livreur and livreur.entreprise != entreprise:
                return Response({'detail': 'Ce livreur n\'appartient pas à votre entreprise.'}, status=400)
            tournee = serializer.save()

            if tournee.statut == StatutTournee.EN_COURS and tournee.livreur:
                tournee.livreur.statut = 'en_tournee'
                tournee.livreur.save()

            if tournee.statut == StatutTournee.TERMINEE:
                for affectation in tournee.affectations.select_related('commande').all():
                    commande = affectation.commande
                    if commande.statut in [StatutCommande.EN_TRANSIT, StatutCommande.PRISE_CHARGE]:
                        ancien = commande.statut
                        commande.statut = StatutCommande.LIVREE
                        commande.save()
                        HistoriqueStatut.objects.create(
                            commande=commande,
                            ancien_statut=ancien,
                            nouveau_statut=StatutCommande.LIVREE,
                            commentaire=f"Tournée {tournee.reference} terminée",
                        )
                if tournee.livreur:
                    tournee.livreur.statut = 'disponible'
                    tournee.livreur.save()

            return Response(TourneeSerializer(tournee).data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        tournee = self._get_tournee(pk, entreprise)
        if tournee.statut == StatutTournee.EN_COURS:
            return Response({'detail': 'Impossible de supprimer une tournée en cours.'}, status=400)
        tournee.delete()
        return Response({'detail': 'Tournée supprimée.'}, status=204)

# ─────────────────────────────────────────
# US-18 — Affectation automatique
# ─────────────────────────────────────────
class AffectationAutoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        # Récupérer les commandes en attente
        commandes = list(Commande.objects.filter(
            entreprise=entreprise,
            statut=StatutCommande.EN_ATTENTE
        ).exclude(affectations__tournee__statut__in=[StatutTournee.PLANIFIEE, StatutTournee.EN_COURS]))

        if not commandes:
            return Response({'detail': 'Aucune commande en attente.', 'affectees': 0})

        # Récupérer les livreurs disponibles
        livreurs = list(Livreur.objects.filter(entreprise=entreprise, statut='disponible'))

        if not livreurs:
            return Response({'detail': 'Aucun livreur disponible.'}, status=400)

        affectees = 0
        assignments = []  # pour debug

        with transaction.atomic():
            # Grouper les commandes par gouvernorat
            from collections import defaultdict
            groupes = defaultdict(list)
            for cmd in commandes:
                groupes[cmd.dest_gouvernorat].append(cmd)

            # Pour chaque groupe, assigner au meilleur livreur
            for gov, cmds_groupe in groupes.items():
                meilleur_livreur = None
                meilleur_score = float('inf')

                for livreur in livreurs:
                    charge = AffectationCommande.objects.filter(
                        tournee__livreur=livreur,
                        tournee__statut__in=[StatutTournee.PLANIFIEE, StatutTournee.EN_COURS]
                    ).count()

                    # Score = charge + pénalité si zone non couverte
                    score = charge * 2
                    if livreur.gouvernorats_couverts and gov not in livreur.gouvernorats_couverts:
                        score += 15   # forte pénalité

                    if score < meilleur_score:
                        meilleur_score = score
                        meilleur_livreur = livreur

                if not meilleur_livreur:
                    continue

                # Créer une tournée pour ce livreur (ou réutiliser celle du jour)
                today = timezone.now().date()
                tournee, _ = Tournee.objects.get_or_create(
                    livreur=meilleur_livreur,
                    entreprise=entreprise,
                    date_prevue=today,
                    statut=StatutTournee.PLANIFIEE,
                    defaults={'zone_gouvernorat': gov}
                )

                # Ajouter toutes les commandes du groupe à cette tournée
                for i, cmd in enumerate(cmds_groupe):
                    ordre = AffectationCommande.objects.filter(tournee=tournee).count() + i + 1
                    AffectationCommande.objects.create(
                        tournee=tournee,
                        commande=cmd,
                        ordre=ordre
                    )

                    # Mettre à jour statut commande
                    ancien = cmd.statut
                    cmd.statut = StatutCommande.PRISE_CHARGE
                    cmd.save()

                    HistoriqueStatut.objects.create(
                        commande=cmd,
                        ancien_statut=ancien,
                        nouveau_statut=StatutCommande.PRISE_CHARGE,
                        commentaire=f'Affecté à {meilleur_livreur.nom_complet} (groupe {gov})'
                    )

                    affectees += 1
                    assignments.append(f"{cmd.reference} → {meilleur_livreur.nom_complet}")

        return Response({
            'detail': f'{affectees} commandes affectées avec regroupement par zone.',
            'affectees': affectees,
            'assignments': assignments[:10]  # limite pour ne pas surcharger la réponse
        })
# AJOUT DE COMMANDE DANS UNE TOURNÉE (CORRIGÉ)
# ─────────────────────────────────────────

class TourneeAffectationsView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_tournee(self, pk, entreprise):
        return get_object_or_404(Tournee, pk=pk, entreprise=entreprise)

    def get(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        tournee = self._get_tournee(pk, entreprise)
        affectations = tournee.affectations.select_related('commande').order_by('ordre')
        return Response(AffectationSerializer(affectations, many=True).data)

    def post(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        tournee = self._get_tournee(pk, entreprise)
        if tournee.statut == StatutTournee.TERMINEE:
            return Response({'detail': 'Impossible d\'ajouter une commande à une tournée terminée.'}, status=400)

        serializer = AffectationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        commande_id = serializer.validated_data['commande_id']

        # Correction : on accepte toutes les commandes de l'entreprise
        commande = get_object_or_404(Commande, pk=commande_id, entreprise=entreprise)

        if AffectationCommande.objects.filter(tournee=tournee, commande=commande).exists():
            return Response({'detail': 'Cette commande est déjà dans la tournée.'}, status=400)

        if AffectationCommande.objects.filter(
            commande=commande,
            tournee__statut__in=[StatutTournee.PLANIFIEE, StatutTournee.EN_COURS]
        ).exists():
            return Response({'detail': 'Cette commande est déjà affectée à une autre tournée active.'}, status=400)

        ordre = AffectationCommande.objects.filter(tournee=tournee).count() + 1
        affectation = AffectationCommande.objects.create(
            tournee=tournee,
            commande=commande,
            ordre=ordre,
            notes=serializer.validated_data.get('notes', ''),
        )

        if commande.statut == StatutCommande.EN_ATTENTE:
            ancien = commande.statut
            commande.statut = StatutCommande.PRISE_CHARGE
            commande.save()
            HistoriqueStatut.objects.create(
                commande=commande,
                ancien_statut=ancien,
                nouveau_statut=StatutCommande.PRISE_CHARGE,
                commentaire=f"Affectée à la tournée {tournee.reference}",
            )

        return Response(AffectationSerializer(affectation).data, status=201)


# ─────────────────────────────────────────
# TOURNÉES DU LIVREUR CONNECTÉ
# ─────────────────────────────────────────

class LivreurTourneeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'livreur':
            return Response({'detail': 'Accès réservé aux livreurs.'}, status=403)

        livreur = getattr(request.user, 'livreur_profile', None)
        if not livreur:
            return Response({'detail': 'Profil livreur introuvable.'}, status=404)

        tournees = Tournee.objects.filter(
            livreur=livreur,
            statut__in=[StatutTournee.PLANIFIEE, StatutTournee.EN_COURS]
        ).prefetch_related('affectations__commande').order_by('date_prevue')

        return Response(TourneeSerializer(tournees, many=True).data)


# ─────────────────────────────────────────
# US-19 — Optimisation de tournée
# ─────────────────────────────────────────

# ─────────────────────────────────────────
# US-19 — Optimisation de tournée (Version améliorée)
# ─────────────────────────────────────────

# ─────────────────────────────────────────
# US-19 — Optimisation de tournée (Version Avancée - Calcul réel de distance)
# ─────────────────────────────────────────

class TourneeOptimiserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        tournee = get_object_or_404(Tournee, pk=pk, entreprise=entreprise)

        if tournee.statut == StatutTournee.TERMINEE:
            return Response({'detail': 'Impossible d\'optimiser une tournée terminée.'}, status=400)

        etapes = list(AffectationCommande.objects.filter(tournee=tournee).select_related('commande'))

        if len(etapes) < 2:
            return Response({'detail': 'Pas assez d\'étapes pour optimiser.'}, status=400)

        def get_coords(cmd):
            lat = getattr(cmd, 'dest_latitude', None)
            lng = getattr(cmd, 'dest_longitude', None)
            if lat is None or lng is None:
                return None
            return (float(lat), float(lng))

        def distance(c1, c2):
            if c1 is None or c2 is None:
                return float('inf')
            return ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2) ** 0.5

        # === ALGORITHME AVANCÉ ===
        # 1. Grouper par gouvernorat pour favoriser le regroupement géographique
        from collections import defaultdict
        groupes = defaultdict(list)
        for etape in etapes:
            gov = etape.commande.dest_gouvernorat or "Inconnu"
            groupes[gov].append(etape)

        route_finale = []

        # 2. Pour chaque groupe, optimiser l'ordre interne par distance
        for gov, liste_groupe in groupes.items():
            if not liste_groupe:
                continue

            # Trouver un bon point de départ (le plus au nord dans le groupe)
            start = max(liste_groupe, key=lambda e: get_coords(e.commande)[0] if get_coords(e.commande) else 0)

            non_visitees = [e for e in liste_groupe if e != start]
            route_groupe = [start]

            while non_visitees:
                current = get_coords(route_groupe[-1].commande)
                # Trouver la commande la plus proche
                next_etape = min(non_visitees, key=lambda e: distance(current, get_coords(e.commande)))
                route_groupe.append(next_etape)
                non_visitees.remove(next_etape)

            route_finale.extend(route_groupe)

        # 3. Sauvegarder le nouvel ordre
        with transaction.atomic():
            for i, etape in enumerate(route_finale, start=1):
                etape.ordre = i
                etape.save()

        # Retour au frontend
        return Response({
            'detail': f'Tournée {tournee.reference} optimisée avec calcul de distance',
            'etapes': [
                {
                    'id': e.id,
                    'ordre': i + 1,
                    'commande_reference': e.commande.reference,
                    'commande_dest_nom': e.commande.dest_nom,
                    'commande_gouvernorat': e.commande.dest_gouvernorat,
                    'commande_adresse': getattr(e.commande, 'dest_adresse', ''),
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
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        tournee = get_object_or_404(Tournee, pk=pk, entreprise=entreprise)

        if tournee.statut == StatutTournee.TERMINEE:
            return Response({'detail': 'Impossible de modifier une tournée terminée.'}, status=400)

        ordre_ids = request.data.get('ordre', [])
        if not ordre_ids:
            return Response({'detail': 'Le champ ordre est requis.'}, status=400)

        etapes = AffectationCommande.objects.filter(tournee=tournee)
        ids_existants = set(etapes.values_list('id', flat=True))

        try:
            ordre_ids = [int(i) for i in ordre_ids]
        except ValueError:
            return Response({'detail': 'Les IDs doivent être des nombres.'}, status=400)

        if set(ordre_ids) != ids_existants:
            return Response({'detail': 'Les IDs ne correspondent pas aux étapes de cette tournée.'}, status=400)

        with transaction.atomic():
            for position, etape_id in enumerate(ordre_ids, start=1):
                AffectationCommande.objects.filter(pk=etape_id, tournee=tournee).update(ordre=position)

        etapes_maj = AffectationCommande.objects.filter(tournee=tournee).select_related('commande').order_by('ordre')

        return Response({
            'detail': 'Ordre mis à jour avec succès.',
            'etapes': AffectationSerializer(etapes_maj, many=True).data
        })


# ─────────────────────────────────────────
# US-21 — Positions GPS
# ─────────────────────────────────────────

class LivreursPositionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        livreurs = Livreur.objects.filter(entreprise=entreprise)

        if request.query_params.get('en_tournee') == 'true':
            livreurs = livreurs.filter(statut='en_tournee')

        data = []
        for l in livreurs:
            nb_commandes = AffectationCommande.objects.filter(
                tournee__livreur=l,
                tournee__statut=StatutTournee.EN_COURS
            ).count()

            tournee_active = Tournee.objects.filter(
                livreur=l, statut=StatutTournee.EN_COURS
            ).first()

            data.append({
                'id': l.id,
                'nom_complet': l.nom_complet,
                'telephone': l.telephone,
                'statut': l.statut,
                'vehicule': l.type_vehicule,
                'latitude': l.latitude,
                'longitude': l.longitude,
                'derniere_maj': l.derniere_position,
                'nb_commandes_en_cours': nb_commandes,
                'tournee_reference': tournee_active.reference if tournee_active else None,
                'tournee_id': tournee_active.id if tournee_active else None,
            })

        return Response(data)


class LivreurPositionUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        livreur = get_object_or_404(Livreur, pk=pk)

        if request.user.role == 'livreur':
            if getattr(request.user, 'livreur_profile', None) != livreur:
                return Response({'detail': 'Accès réservé à votre propre profil.'}, status=403)
        elif request.user.role == 'entreprise':
            entreprise = get_entreprise_or_403(request.user)
            if not entreprise or livreur.entreprise != entreprise:
                return Response({'detail': 'Accès réservé aux livreurs de votre entreprise.'}, status=403)
        else:
            return Response({'detail': 'Accès non autorisé.'}, status=403)

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        if lat is None or lng is None:
            return Response({'detail': 'latitude et longitude sont requis.'}, status=400)

        livreur.latitude = float(lat)
        livreur.longitude = float(lng)
        livreur.derniere_position = timezone.now()
        livreur.save(update_fields=['latitude', 'longitude', 'derniere_position'])

        return Response({'detail': 'Position mise à jour.', 'latitude': lat, 'longitude': lng})
