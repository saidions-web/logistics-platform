"""

views_tournee.py — Gestion du statut de tournée (démarrer / terminer)

et endpoint positions GPS pour l'entreprise (suivi temps réel).
 
Routes à ajouter dans urls.py :

  PATCH /api/entreprise/livreur/tournees/<pk>/statut/  → démarrer / terminer (livreur mobile)

  GET   /api/entreprise/livreurs/positions/            → positions GPS de tous les livreurs (entreprise)

"""
 
from rest_framework.views import APIView

from rest_framework.permissions import IsAuthenticated

from rest_framework.response import Response

from django.shortcuts import get_object_or_404

from django.utils import timezone
 
# Livreur et StatutLivreur sont dans l'app entreprise

from .models import Livreur, StatutLivreur
 
# Tournee et StatutTournee sont dans l'app tournees

from tournees.models import Tournee, StatutTournee
 
 
# ═══════════════════════════════════════════════════════════════

# LIVREUR — Démarrer / Terminer une tournée

# PATCH /api/entreprise/livreur/tournees/<pk>/statut/

# ═══════════════════════════════════════════════════════════════
 
class LivreurTourneeStatutView(APIView):

    permission_classes = [IsAuthenticated]
 
    TRANSITIONS_AUTORISEES = {

        StatutTournee.PLANIFIEE: [StatutTournee.EN_COURS],

        StatutTournee.EN_COURS:  [StatutTournee.TERMINEE],

    }
 
    def patch(self, request, pk):

        if request.user.role != 'livreur':

            return Response({'detail': 'Accès réservé aux livreurs.'}, status=403)
 
        livreur = getattr(request.user, 'livreur_profile', None)

        if not livreur:

            return Response({'detail': 'Profil livreur introuvable.'}, status=404)
 
        tournee = get_object_or_404(Tournee, pk=pk, livreur=livreur)
 
        nouveau_statut = request.data.get('statut')

        if not nouveau_statut:

            return Response({'detail': 'Le champ "statut" est requis.'}, status=400)
 
        transitions = self.TRANSITIONS_AUTORISEES.get(tournee.statut, [])

        if nouveau_statut not in transitions:

            return Response(

                {'detail': f'Transition impossible : {tournee.statut} → {nouveau_statut}. Autorisées : {transitions}'},

                status=400,

            )
 
        ancien_statut  = tournee.statut

        tournee.statut = nouveau_statut
 
        if nouveau_statut == StatutTournee.EN_COURS:
            tournee.heure_depart_reelle = timezone.now()
            livreur.statut = StatutLivreur.EN_TOURNEE
            livreur.save(update_fields=['statut'])

            # ✅ AJOUT : mise à jour des commandes en EN_TRANSIT
            from commandes.models import Commande, StatutCommande, HistoriqueStatut
            for affectation in tournee.affectations.select_related('commande').all():
                commande = affectation.commande
                if commande.statut in [
                    StatutCommande.EN_ATTENTE,
                    StatutCommande.PRISE_CHARGE
                ]:
                    ancien = commande.statut
                    commande.statut = StatutCommande.EN_TRANSIT
                    commande.save()
                    HistoriqueStatut.objects.create(
                        commande=commande,
                        ancien_statut=ancien,
                        nouveau_statut=StatutCommande.EN_TRANSIT,
                        commentaire=f"Tournée {tournee.reference} démarrée par le livreur",
                    )

 
        elif nouveau_statut == StatutTournee.TERMINEE:

            tournee.heure_fin_reelle = timezone.now()

            autres_en_cours = Tournee.objects.filter(

                livreur=livreur,

                statut=StatutTournee.EN_COURS,

            ).exclude(pk=pk).exists()

            if not autres_en_cours:

                livreur.statut = StatutLivreur.DISPONIBLE

                livreur.save(update_fields=['statut'])
 
        tournee.save()
 
        return Response({

            'id':            tournee.id,

            'reference':     tournee.reference,

            'statut':        tournee.statut,

            'ancien_statut': ancien_statut,

            'heure_depart':  tournee.heure_depart_reelle.isoformat() if tournee.heure_depart_reelle else None,

            'heure_fin':     tournee.heure_fin_reelle.isoformat()    if tournee.heure_fin_reelle    else None,

            'detail':        f'Tournée passée de "{ancien_statut}" à "{nouveau_statut}".',

        })
 
 
# ═══════════════════════════════════════════════════════════════

# ENTREPRISE — Positions GPS de tous ses livreurs

# GET /api/entreprise/livreurs/positions/

# ═══════════════════════════════════════════════════════════════
 
class EntrepriseLivreursPositionsView(APIView):

    permission_classes = [IsAuthenticated]
 
    def get(self, request):

        if request.user.role != 'entreprise':

            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)
 
        entreprise = getattr(request.user, 'entreprise_profile', None)

        if not entreprise:

            return Response({'detail': 'Profil entreprise introuvable.'}, status=404)
 
        livreurs = Livreur.objects.filter(entreprise=entreprise).order_by('statut', 'nom')
 
        data = []

        for livreur in livreurs:

            tournee_active = Tournee.objects.filter(

                livreur=livreur,

                statut=StatutTournee.EN_COURS,

            ).first()
 
            nb_commandes = 0

            if tournee_active:

                nb_commandes = tournee_active.affectations.exclude(

                    commande__statut__in=['livree', 'retournee']

                ).count()
 
            data.append({

                'id':                    livreur.id,

                'nom_complet':           f"{livreur.prenom} {livreur.nom}",

                'nom':                   livreur.nom,

                'prenom':                livreur.prenom,

                'telephone':             livreur.telephone,

                'statut':                livreur.statut,

                'vehicule':              getattr(livreur, 'type_vehicule', None),

                'latitude':              livreur.latitude,

                'longitude':             livreur.longitude,

                'derniere_maj':          livreur.derniere_position.isoformat() if livreur.derniere_position else None,

                'tournee_id':            tournee_active.id        if tournee_active else None,

                'tournee_reference':     tournee_active.reference if tournee_active else None,

                'nb_commandes_en_cours': nb_commandes,

            })
 
        return Response(data)
 