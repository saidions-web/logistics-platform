from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Notification
from .serializers import NotificationSerializer


class NotificationList(APIView):
    """
    GET /notifications/
    Retourne toutes les notifications de l'utilisateur connecté,
    triées de la plus récente à la plus ancienne.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(
            utilisateur=request.user         # ✅ champ corrigé : utilisateur
        ).order_by("-created_at")
        serializer = NotificationSerializer(notifs, many=True)
        return Response(serializer.data)


class MarkAsRead(APIView):
    """
    POST /notifications/<pk>/read/
    Marque une notification comme lue.
    Retourne 404 si la notification n'appartient pas à l'utilisateur connecté.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notif = get_object_or_404(
            Notification,
            pk=pk,
            utilisateur=request.user         # ✅ champ corrigé : utilisateur
        )
        notif.is_read = True
        notif.save()
        return Response({"success": True}, status=status.HTTP_200_OK)


class MarkAllAsRead(APIView):
    """
    POST /notifications/read-all/
    Marque toutes les notifications de l'utilisateur connecté comme lues.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            utilisateur=request.user,
            is_read=False
        ).update(is_read=True)
        return Response({"success": True}, status=status.HTTP_200_OK)


class UnreadCount(APIView):
    """
    GET /notifications/unread-count/
    Retourne le nombre de notifications non lues de l'utilisateur connecté.
    Utile pour afficher le badge dans le frontend.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            utilisateur=request.user,
            is_read=False
        ).count()
        return Response({"unread_count": count})