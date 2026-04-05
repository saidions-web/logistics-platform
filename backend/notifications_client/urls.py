from django.urls import path
from .views import JournalNotificationsView, ConfigNotificationView, TesterNotificationView

urlpatterns = [
    path('',         JournalNotificationsView.as_view()),  # GET  — US-34
    path('config/',  ConfigNotificationView.as_view()),    # GET/POST — US-33
    path('tester/',  TesterNotificationView.as_view()),    # POST — test
]