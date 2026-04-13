from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q

from accounts.models import EntrepriseProfile
from commandes.models import Commande, StatutCommande, HistoriqueStatut

# IMPORTS CORRIGÉS
from .models import Livreur
from .serializers import (
    LivreurSerializer, 
    LivreurCreateSerializer, 
    LivreurUpdateSerializer,
)

from commandes.serializers import CommandeSerializer   # ← CETTE LIGNE ÉTAIT MANQUANTE

from recommandation.models import Recommandation


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
            statut='en_tournee'
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
        import uuid, secrets, string

        data = serializer.validated_data

        base  = f"{data['prenom'].lower()}.{data['nom'].lower()}".replace(' ', '')
        email = f"{base}.{uuid.uuid4().hex[:4]}@logisync.local"

        alphabet = string.ascii_letters + string.digits
        password = ''.join(secrets.choice(alphabet) for _ in range(8))

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
# LIVREUR DÉTAIL - Version corrigée (GET / PATCH / DELETE)
# ─────────────────────────────────────────

class LivreurDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_livreur(self, pk, entreprise):
        """Récupère le livreur avec vérification entreprise"""
        return get_object_or_404(
            Livreur, 
            pk=pk, 
            entreprise=entreprise
        )

    def get(self, request, pk):
        """Récupérer un livreur"""
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        livreur = self._get_livreur(pk, entreprise)
        return Response(LivreurSerializer(livreur).data)

    def patch(self, request, pk):
        """Modifier un livreur"""
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        livreur = self._get_livreur(pk, entreprise)
        serializer = LivreurUpdateSerializer(livreur, data=request.data, partial=True)

        if serializer.is_valid():
            livreur = serializer.save()
            return Response(LivreurSerializer(livreur).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        """Supprimer un livreur de manière sécurisée"""
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        livreur = self._get_livreur(pk, entreprise)

        # Dissocier l'utilisateur avant suppression (évite les erreurs de contrainte)
        if livreur.user:
            livreur.user = None
            livreur.save(update_fields=['user'])

        # Suppression du livreur
        livreur.delete()

        return Response(
            {'detail': 'Livreur supprimé avec succès.'}, 
            status=status.HTTP_204_NO_CONTENT
        )