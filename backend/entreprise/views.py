from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.db import transaction   # pour la suppression livreur

from accounts.models import EntrepriseProfile
from commandes.models import Commande, StatutCommande, HistoriqueStatut

# IMPORTS CORRIGÉS
from .models import Livreur, PreuveLivraison          # ← Ajouté PreuveLivraison
from .serializers import (
    LivreurSerializer, 
    LivreurCreateSerializer, 
    LivreurUpdateSerializer,
    PreuveLivraisonSerializer,                       # ← AJOUT IMPORTANT
)

from commandes.serializers import CommandeSerializer
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

        # Requête optimisée avec select_related pour récupérer le vendeur + sa boutique
        commandes = Commande.objects.filter(
            id__in=reco_ids
        ).select_related('vendeur', 'vendeur__vendeur_profile')

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

# ══════════════════════════════════════════════════
# CHANGER LE STATUT D'UNE COMMANDE (LIVREUR + ENTREPRISE)
# PATCH /api/entreprise/commandes/<id>/statut/
# ══════════════════════════════════════════════════

# ══════════════════════════════════════════════════
# CHANGER LE STATUT D'UNE COMMANDE (LIVREUR + ENTREPRISE)
# PATCH /api/entreprise/commandes/<id>/statut/
# ══════════════════════════════════════════════════

class EntrepriseCommandeStatutView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        # === LIVREUR ===
        if request.user.role == 'livreur':
            livreur = getattr(request.user, 'livreur_profile', None)
            if not livreur:
                return Response({'detail': 'Profil livreur introuvable.'}, status=404)

            commande = get_object_or_404(Commande, pk=pk)
            # Vérifier que la commande appartient bien à une tournée de ce livreur
            if not commande.affectations.filter(tournee__livreur=livreur).exists():
                return Response({'detail': 'Cette commande ne vous est pas assignée.'}, status=403)

        # === ENTREPRISE ===
        else:
            entreprise = get_entreprise_or_403(request.user)
            if not entreprise:
                return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

            reco_ids = Recommandation.objects.filter(
                entreprise_choisie=entreprise
            ).values_list('commande_id', flat=True)

            commande = get_object_or_404(Commande, pk=pk, id__in=reco_ids)

        nouveau_statut = request.data.get('statut')
        commentaire = request.data.get('commentaire', 'Action effectuée par le livreur via l\'application mobile')

        if not nouveau_statut:
            return Response({'detail': 'Le champ statut est requis.'}, status=400)

        # Restriction pour le livreur : il ne peut que mettre "livree" ou "retournee"
        if request.user.role == 'livreur':
            if nouveau_statut not in [StatutCommande.LIVREE, StatutCommande.RETOURNEE]:
                return Response({'detail': 'Le livreur ne peut que marquer Livrée ou Retour.'}, status=403)

        ancien_statut = commande.statut
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
        """
        Supprime un livreur de manière sécurisée :
        - Désactive son compte utilisateur (bloque l'accès à l'app mobile)
        - Dissocie le profil Livreur
        - Nettoie les tournées en cours associées
        """
        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        livreur = self._get_livreur(pk, entreprise)

        try:
            with transaction.atomic():
                # 1. Désactiver le compte utilisateur
                if livreur.user:
                    user = livreur.user
                    user.is_active = False
                    user.save(update_fields=['is_active'])

                # 2. Nettoyer les tournées en cours / planifiées
                from .models import Tournee, StatutTournee   # Import local pour éviter circular import

                Tournee.objects.filter(
                    livreur=livreur,
                    statut__in=[StatutTournee.PLANIFIEE, StatutTournee.EN_COURS]
                ).update(livreur=None)

                # 3. Dissocier le user du profil livreur
                livreur.user = None
                livreur.save(update_fields=['user'])

                # 4. Supprimer le profil Livreur
                livreur.delete()

            return Response({
                'detail': 'Livreur supprimé avec succès. '
                          'Son compte utilisateur a été désactivé et ne peut plus se connecter à l\'application mobile.'
            }, status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            print(f"Erreur suppression livreur {pk}: {e}")
            return Response({
                'detail': 'Une erreur est survenue lors de la suppression du livreur.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
# Ajoute cette classe dans le fichier views.py de l'app entreprise

class PreuveLivraisonCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, commande_id):
        if request.user.role != 'livreur':
            return Response({'detail': 'Accès réservé aux livreurs.'}, status=403)

        livreur = getattr(request.user, 'livreur_profile', None)
        if not livreur:
            return Response({'detail': 'Profil livreur introuvable.'}, status=404)

        commande = get_object_or_404(Commande, pk=commande_id)

        # Vérification que la commande appartient au livreur
        if not commande.affectations.filter(tournee__livreur=livreur).exists():
            return Response({'detail': 'Cette commande ne vous est pas assignée.'}, status=403)

        affectation = commande.affectations.first()
        tournee = affectation.tournee if affectation else None

        serializer = PreuveLivraisonSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        PreuveLivraison.objects.update_or_create(
            commande=commande,
            defaults={
                'tournee': tournee,
                'photo_preuve': request.FILES.get('photo_preuve'),
                'commentaire_livreur': serializer.validated_data.get('commentaire_livreur', ''),
            }
        )

        return Response({'detail': 'Preuve de livraison enregistrée.'}, status=201)