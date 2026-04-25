from django.urls import path
from .views import JournalNotificationsView

urlpatterns = [
    path('',         JournalNotificationsView.as_view()),  # GET  — US-34
]