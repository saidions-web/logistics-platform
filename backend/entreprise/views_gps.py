# backend/entreprise/views_gps.py

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from entreprise.models import Livreur
from accounts.models import EntrepriseProfile   # pour get_entreprise_or_403 si besoin


def get_entreprise_or_403(user):
    """Helper réutilisable"""
    if user.role != 'entreprise':
        return None
    return getattr(user, 'entreprise_profile', None)


# ===================================================================
# MISE À JOUR POSITION GPS DU LIVREUR (Mobile)
# POST /api/entreprise/livreurs/<pk>/position/
# ===================================================================
class LivreurPositionUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        livreur = get_object_or_404(Livreur, pk=pk)

        # Autorisation : livreur lui-même OU son entreprise
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

        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return Response({'detail': 'Coordonnées GPS invalides.'}, status=400)

        # Mise à jour
        livreur.latitude = lat
        livreur.longitude = lng
        livreur.derniere_position = timezone.now()
        livreur.save(update_fields=['latitude', 'longitude', 'derniere_position'])

        return Response({
            'detail': 'Position mise à jour avec succès.',
            'latitude': lat,
            'longitude': lng,
            'derniere_maj': livreur.derniere_position.isoformat() if livreur.derniere_position else None,
        })


# ===================================================================
# POSITIONS DE TOUS LES LIVREURS (pour le suivi entreprise)
# GET /api/entreprise/livreurs/positions/
# ===================================================================
class EntrepriseLivreursPositionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'entreprise':
            return Response({'detail': 'Accès réservé aux entreprises.'}, status=403)

        entreprise = get_entreprise_or_403(request.user)
        if not entreprise:
            return Response({'detail': 'Profil entreprise introuvable.'}, status=404)

        livreurs = Livreur.objects.filter(entreprise=entreprise)

        if request.query_params.get('en_tournee') == 'true':
            livreurs = livreurs.filter(statut='en_tournee')

        data = []
        for l in livreurs:
            tournee_active = l.tournees.filter(statut='en_cours').first()

            nb_commandes = 0
            if tournee_active:
                nb_commandes = tournee_active.affectations.exclude(
                    commande__statut__in=['livree', 'retournee']
                ).count()

            data.append({
                'id': l.id,
                'nom_complet': l.nom_complet,
                'telephone': l.telephone,
                'statut': l.statut,
                'vehicule': l.type_vehicule,
                'latitude': l.latitude,
                'longitude': l.longitude,
                'derniere_maj': l.derniere_position.isoformat() if l.derniere_position else None,
                'tournee_id': tournee_active.id if tournee_active else None,
                'tournee_reference': tournee_active.reference if tournee_active else None,
                'nb_commandes_en_cours': nb_commandes,
            })

        return Response(data)