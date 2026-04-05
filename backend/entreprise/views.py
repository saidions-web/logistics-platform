from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from accounts.models import EntrepriseProfile
from commandes.models import Commande, StatutCommande, HistoriqueStatut
from .models import Livreur, Tournee, AffectationCommande, StatutLivreur, StatutTournee
from .serializers import (
    LivreurSerializer, LivreurCreateSerializer, LivreurUpdateSerializer,
    TourneeSerializer, TourneeListSerializer,
    TourneeCreateSerializer, TourneeUpdateSerializer,
    AffectationCreateSerializer, AffectationSerializer,
)
from commandes.serializers import CommandeSerializer


# ─────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────

def get_entreprise_or_403(user):
    if user.role != 'entreprise':
        return None
    return getattr(user, 'entreprise_profile', None)


# ─────────────────────────────────────────
# DASHBOARD ENTREPRISE
# GET /api/entreprise/dashboard/
# ─────────────────────────────────────────

class EntrepriseDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        from recommandation.models import Recommandation

        reco_ids = Recommandation.objects.filter(
            entreprise_choisie=entreprise
        ).values_list('commande_id', flat=True)

        commandes = Commande.objects.filter(id__in=reco_ids)

        total      = commandes.count()
        en_attente = commandes.filter(statut=StatutCommande.EN_ATTENTE).count()
        en_transit = commandes.filter(
            statut__in=[StatutCommande.EN_TRANSIT, StatutCommande.PRISE_CHARGE]
        ).count()
        livrees    = commandes.filter(statut=StatutCommande.LIVREE).count()
        retournees = commandes.filter(statut=StatutCommande.RETOURNEE).count()

        taux_reussite   = round((livrees / total * 100), 1) if total > 0 else 0
        livreurs_actifs = Livreur.objects.filter(
            entreprise=entreprise,
            statut=StatutLivreur.EN_TOURNEE
        ).count()

        kpi = {
            'total':           total,
            'en_attente':      en_attente,
            'en_transit':      en_transit,
            'livrees':         livrees,
            'retournees':      retournees,
            'taux_reussite':   taux_reussite,
            'livreurs_actifs': livreurs_actifs,
        }

        recentes = commandes.order_by('-created_at')[:10]

        return Response({
            'kpi': kpi,
            'commandes_recentes': CommandeSerializer(recentes, many=True).data,
        })


# ─────────────────────────────────────────
# COMMANDES REÇUES PAR L'ENTREPRISE
# GET /api/entreprise/commandes/
# ─────────────────────────────────────────

class EntrepriseCommandesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        from recommandation.models import Recommandation

        reco_ids = Recommandation.objects.filter(
            entreprise_choisie=entreprise
        ).values_list('commande_id', flat=True)

        commandes = Commande.objects.filter(id__in=reco_ids)

        statut = request.query_params.get('statut')
        if statut:
            commandes = commandes.filter(statut=statut)

        gouvernorat = request.query_params.get('gouvernorat')
        if gouvernorat:
            commandes = commandes.filter(dest_gouvernorat=gouvernorat)

        search = request.query_params.get('search')
        if search:
            commandes = commandes.filter(
                Q(reference__icontains=search) |
                Q(dest_nom__icontains=search) |
                Q(dest_prenom__icontains=search) |
                Q(dest_telephone__icontains=search)
            )

        commandes = commandes.order_by('-created_at')
        return Response(CommandeSerializer(commandes, many=True).data)


# ─────────────────────────────────────────
# CHANGER LE STATUT D'UNE COMMANDE
# PATCH /api/entreprise/commandes/<id>/statut/
# ─────────────────────────────────────────

class EntrepriseCommandeStatutView(APIView):
    permission_classes = [IsAuthenticated]

    TRANSITIONS_AUTORISEES = {
        StatutCommande.EN_ATTENTE:   [StatutCommande.PRISE_CHARGE, StatutCommande.ANNULEE],
        StatutCommande.PRISE_CHARGE: [StatutCommande.EN_TRANSIT,   StatutCommande.RETOURNEE],
        StatutCommande.EN_TRANSIT:   [StatutCommande.LIVREE,       StatutCommande.RETOURNEE],
    }

    def patch(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        from recommandation.models import Recommandation

        reco_ids = Recommandation.objects.filter(
            entreprise_choisie=entreprise
        ).values_list('commande_id', flat=True)

        commande       = get_object_or_404(Commande, pk=pk, id__in=reco_ids)
        nouveau_statut = request.data.get('statut')
        commentaire    = request.data.get('commentaire', '')

        if not nouveau_statut:
            return Response({'detail': 'Le champ statut est requis.'}, status=400)

        transitions_ok = self.TRANSITIONS_AUTORISEES.get(commande.statut, [])
        if nouveau_statut not in transitions_ok:
            return Response(
                {'detail': f"Transition impossible : {commande.statut} → {nouveau_statut}"},
                status=400
            )

        ancien_statut   = commande.statut
        commande.statut = nouveau_statut
        commande.save()

        HistoriqueStatut.objects.create(
            commande=commande,
            ancien_statut=ancien_statut,
            nouveau_statut=nouveau_statut,
            commentaire=commentaire,
        )

        return Response(CommandeSerializer(commande).data)


# ─────────────────────────────────────────
# LIVREURS
# GET  /api/entreprise/livreurs/
# POST /api/entreprise/livreurs/
# ─────────────────────────────────────────

class LivreurListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        livreurs = Livreur.objects.filter(entreprise=entreprise)

        statut = request.query_params.get('statut')
        if statut:
            livreurs = livreurs.filter(statut=statut)

        return Response(LivreurSerializer(livreurs, many=True).data)

    def post(self, request):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        serializer = LivreurCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        from accounts.models import CustomUser
        import uuid
        import secrets
        import string

        data = serializer.validated_data

        # Email unique comme identifiant : prenom.nom.xxxx@logisync.local
        base  = f"{data['prenom'].lower()}.{data['nom'].lower()}".replace(' ', '')
        email = f"{base}.{uuid.uuid4().hex[:4]}@logisync.local"

        # Mot de passe aléatoire 8 caractères (lettres + chiffres)
        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for _ in range(8))

        # Créer le CustomUser — email comme identifiant, pas de username
        # is_email_verified + is_approved = True car créé directement par l'entreprise
        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            role='livreur',
            first_name=data['prenom'],
            last_name=data['nom'],
        )
        user.is_email_verified = True
        user.is_approved       = True
        user.save(update_fields=['is_email_verified', 'is_approved'])

        # Créer le livreur lié au user
        livreur = serializer.save(entreprise=entreprise, user=user)

        return Response({
            **LivreurSerializer(livreur).data,
            'login_info': {
                'username': email,
                'password': password,
                'message': 'Communiquer ces identifiants au livreur'
            }
        }, status=201)


# ─────────────────────────────────────────
# LIVREUR DÉTAIL
# GET    /api/entreprise/livreurs/<id>/
# PATCH  /api/entreprise/livreurs/<id>/
# DELETE /api/entreprise/livreurs/<id>/
# ─────────────────────────────────────────

class LivreurDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_livreur(self, pk, entreprise):
        return get_object_or_404(Livreur, pk=pk, entreprise=entreprise)

    def get(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        livreur = self._get_livreur(pk, entreprise)
        return Response(LivreurSerializer(livreur).data)

    def patch(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        livreur    = self._get_livreur(pk, entreprise)
        serializer = LivreurUpdateSerializer(livreur, data=request.data, partial=True)
        if serializer.is_valid():
            livreur = serializer.save()
            return Response(LivreurSerializer(livreur).data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        livreur = self._get_livreur(pk, entreprise)
        # Supprimer aussi le compte user associé
        if livreur.user:
            livreur.user.delete()
        livreur.delete()
        return Response({'detail': 'Livreur supprimé.'}, status=204)


# ─────────────────────────────────────────
# TOURNÉES ENTREPRISE
# GET  /api/entreprise/tournees/
# POST /api/entreprise/tournees/
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
                return Response(
                    {'detail': 'Ce livreur n\'appartient pas à votre entreprise.'},
                    status=400
                )
            tournee = serializer.save(entreprise=entreprise)
            return Response(TourneeSerializer(tournee).data, status=201)
        return Response(serializer.errors, status=400)


# ─────────────────────────────────────────
# TOURNÉE DÉTAIL
# GET    /api/entreprise/tournees/<id>/
# PATCH  /api/entreprise/tournees/<id>/
# DELETE /api/entreprise/tournees/<id>/
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
                return Response(
                    {'detail': 'Ce livreur n\'appartient pas à votre entreprise.'},
                    status=400
                )
            tournee = serializer.save()

            # Si en_cours → mettre le livreur en tournée
            if tournee.statut == StatutTournee.EN_COURS and tournee.livreur:
                tournee.livreur.statut = StatutLivreur.EN_TOURNEE
                tournee.livreur.save()

            # Si terminée → passer toutes les commandes en_transit/prise_charge → livree
            if tournee.statut == StatutTournee.TERMINEE:
                affectations = tournee.affectations.select_related('commande').all()
                for affectation in affectations:
                    commande = affectation.commande
                    if commande.statut in [StatutCommande.EN_TRANSIT, StatutCommande.PRISE_CHARGE]:
                        ancien_statut   = commande.statut
                        commande.statut = StatutCommande.LIVREE
                        commande.save()
                        HistoriqueStatut.objects.create(
                            commande=commande,
                            ancien_statut=ancien_statut,
                            nouveau_statut=StatutCommande.LIVREE,
                            commentaire=f"Tournée {tournee.reference} terminée",
                        )
                if tournee.livreur:
                    tournee.livreur.statut = StatutLivreur.DISPONIBLE
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
# AFFECTATIONS D'UNE TOURNÉE
# GET    /api/entreprise/tournees/<id>/commandes/
# POST   /api/entreprise/tournees/<id>/commandes/
# DELETE /api/entreprise/tournees/<id>/commandes/
# ─────────────────────────────────────────

class TourneeAffectationsView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_tournee(self, pk, entreprise):
        return get_object_or_404(Tournee, pk=pk, entreprise=entreprise)

    def get(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
        tournee      = self._get_tournee(pk, entreprise)
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

        from recommandation.models import Recommandation

        reco_ids = Recommandation.objects.filter(
            entreprise_choisie=entreprise
        ).values_list('commande_id', flat=True)

        commande = get_object_or_404(
            Commande,
            pk=serializer.validated_data['commande_id'],
            id__in=reco_ids
        )

        if AffectationCommande.objects.filter(tournee=tournee, commande=commande).exists():
            return Response({'detail': 'Cette commande est déjà dans la tournée.'}, status=400)

        affectation = AffectationCommande.objects.create(
            tournee=tournee,
            commande=commande,
            ordre=serializer.validated_data.get('ordre', 1),
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

    def delete(self, request, pk):
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        tournee     = self._get_tournee(pk, entreprise)
        commande_id = request.data.get('commande_id')

        if not commande_id:
            return Response({'detail': 'commande_id requis.'}, status=400)

        affectation = get_object_or_404(
            AffectationCommande, tournee=tournee, commande_id=commande_id
        )
        affectation.delete()
        return Response({'detail': 'Commande retirée de la tournée.'})


# ─────────────────────────────────────────
# TOURNÉES DU LIVREUR CONNECTÉ
# GET /api/entreprise/livreur/tournees/
# — utilisé par l'app mobile livreur
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