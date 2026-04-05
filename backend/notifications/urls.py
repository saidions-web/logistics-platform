from django.urls import path
from .views import NotificationList, MarkAsRead, MarkAllAsRead, UnreadCount

urlpatterns = [
    path("", NotificationList.as_view()),                    # GET  → liste des notifs
    path("unread-count/", UnreadCount.as_view()),            # GET  → badge compteur
    path("read-all/", MarkAllAsRead.as_view()),              # POST → tout marquer lu
    path("<int:pk>/read/", MarkAsRead.as_view()),            # POST → marquer une notif lue
]