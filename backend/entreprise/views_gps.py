# views_gps.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Livreur, StatutLivreur
from tournees.models import Tournee, AffectationCommande, StatutTournee


class LivreurGPSUpdateView(APIView):
    """ POST /api/entreprise/livreurs/gps/update/ """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'livreur':
            return Response({'detail': 'Accès réservé aux livreurs.'}, status=403)

        livreur = getattr(request.user, 'livreur_profile', None)
        if not livreur:
            return Response({'detail': 'Profil livreur introuvable.'}, status=404)

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')

        if lat is None or lng is None:
            return Response({'detail': 'latitude et longitude sont requis.'}, status=400)

        try:
            lat = float(lat)
            lng = float(lng)
        except (ValueError, TypeError):
            return Response({'detail': 'Coordonnées GPS invalides.'}, status=400)

        # Validation Tunisie
        if not (29.0 <= lat <= 38.0 and 7.0 <= lng <= 12.0):
            return Response({'detail': 'Coordonnées hors zone Tunisie.'}, status=400)

        livreur.latitude = lat
        livreur.longitude = lng
        livreur.derniere_position = timezone.now()
        livreur.save(update_fields=['latitude', 'longitude', 'derniere_position'])

        return Response({
            'detail': 'Position mise à jour.',
            'latitude': lat,
            'longitude': lng,
            'timestamp': livreur.derniere_position.isoformat(),
        })


class EtapeNavigationView(APIView):
    """ GET /api/entreprise/livreur/navigation/<affectation_id>/ """
    permission_classes = [IsAuthenticated]

    def get(self, request, affectation_id):
        if request.user.role != 'livreur':
            return Response({'detail': 'Accès réservé aux livreurs.'}, status=403)

        livreur = getattr(request.user, 'livreur_profile', None)
        if not livreur:
            return Response({'detail': 'Profil livreur introuvable.'}, status=404)

        affectation = get_object_or_404(
            AffectationCommande,
            pk=affectation_id,
            tournee__livreur=livreur
        )

        commande = affectation.commande
        adresse_complete = f"{commande.dest_adresse}, {commande.dest_gouvernorat}, Tunisie"

        dest_lat = getattr(commande, 'dest_latitude', None)
        dest_lng = getattr(commande, 'dest_longitude', None)

        if dest_lat and dest_lng:
            google_url = f"https://www.google.com/maps/dir/?api=1&destination={dest_lat},{dest_lng}&travelmode=driving"
            waze_url   = f"https://waze.com/ul?ll={dest_lat},{dest_lng}&navigate=yes"
            apple_url  = f"https://maps.apple.com/?daddr={dest_lat},{dest_lng}&dirflg=d"
        else:
            encoded = adresse_complete.replace(' ', '+').replace(',', '%2C')
            google_url = f"https://www.google.com/maps/dir/?api=1&destination={encoded}&travelmode=driving"
            waze_url   = f"https://waze.com/ul?q={encoded}&navigate=yes"
            apple_url  = f"https://maps.apple.com/?q={encoded}"

        return Response({
            'commande_reference': commande.reference,
            'dest_nom': commande.dest_nom,
            'dest_prenom': commande.dest_prenom,
            'dest_telephone': commande.dest_telephone,
            'dest_adresse': commande.dest_adresse,
            'dest_gouvernorat': commande.dest_gouvernorat,
            'adresse_complete': adresse_complete,
            'montant_a_collecter': str(commande.montant_a_collecter),
            'dest_latitude': dest_lat,
            'dest_longitude': dest_lng,
            'has_gps': bool(dest_lat and dest_lng),
            'navigation': {
                'google_maps': google_url,
                'waze': waze_url,
                'apple_maps': apple_url,
            },
            'ordre': affectation.ordre,
            'statut': commande.statut,
        })