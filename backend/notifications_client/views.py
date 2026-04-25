from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import NotificationClient
from .serializers import NotificationClientSerializer


# ══════════════════════════════════════════════
# US-34 — Journal des notifications (SMS uniquement)
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
        statut = request.query_params.get('statut')
        if statut:
            notifs = notifs.filter(statut=statut)

        data = NotificationClientSerializer(
            notifs.select_related('commande')[:100], many=True
        ).data
        return Response(data)