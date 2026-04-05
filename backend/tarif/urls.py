from django.urls import path

from .views import TarifListCreateView, TarifDetailView
 
urlpatterns = [

    path('', TarifListCreateView.as_view()),

    path('<int:pk>/', TarifDetailView.as_view()),

]
 