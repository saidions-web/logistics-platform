from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers as drf_serializers

from .models import NotificationClient
from .serializers import NotificationClientSerializer


# ══════════════════════════════════════════════
# US-34 — Journal notifications
# GET /api/notifications-client/
# ══════════════════════════════════════════════

class JournalNotificationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        if user.role == 'vendeur':
            notifs = NotificationClient.objects.filter(commande__vendeur=user)
        elif user.role in ('admin', 'super_admin'):
            notifs = NotificationClient.objects.all()
        else:
            return Response({'detail': 'Accès refusé.'}, status=403)

        # Filtres optionnels
        canal  = request.query_params.get('canal')
        statut = request.query_params.get('statut')
        if canal:
            notifs = notifs.filter(canal=canal)
        if statut:
            notifs = notifs.filter(statut=statut)

        data = NotificationClientSerializer(
            notifs.select_related('commande')[:100], many=True
        ).data
        return Response(data)


# ══════════════════════════════════════════════
# US-33 — Config canal vendeur
# GET  /api/notifications-client/config/
# POST /api/notifications-client/config/
# ══════════════════════════════════════════════

class ConfigSerializer(drf_serializers.Serializer):
    canal        = drf_serializers.ChoiceField(choices=['email', 'sms', 'both'])
    modele_email = drf_serializers.CharField(required=False, allow_blank=True, default='')
    modele_sms   = drf_serializers.CharField(required=False, allow_blank=True, max_length=160, default='')


class ConfigNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'vendeur':
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)
        try:
            cfg = request.user.config_notification
            return Response({
                'canal':        cfg.canal,
                'modele_email': cfg.modele_email,
                'modele_sms':   cfg.modele_sms,
            })
        except Exception:
            return Response({'canal': 'both', 'modele_email': '', 'modele_sms': ''})

    def post(self, request):
        if request.user.role != 'vendeur':
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        serializer = ConfigSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        from .models_config import ConfigNotificationVendeur
        ConfigNotificationVendeur.objects.update_or_create(
            vendeur=request.user,
            defaults=serializer.validated_data,
        )
        return Response(serializer.validated_data)


# ══════════════════════════════════════════════
# Test manuel
# POST /api/notifications-client/tester/
# Body : { commande_id: int }
# ══════════════════════════════════════════════

class TesterNotificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'vendeur':
            return Response({'detail': 'Accès réservé aux vendeurs.'}, status=403)

        commande_id = request.data.get('commande_id')
        if not commande_id:
            return Response({'detail': 'commande_id requis.'}, status=400)

        from commandes.models import Commande
        from django.shortcuts import get_object_or_404
        commande = get_object_or_404(Commande, pk=commande_id, vendeur=request.user)

        from .service import notifier_client
        result = notifier_client(commande, 'en_transit')

        return Response({'detail': 'Notification envoyée.', 'result': result})