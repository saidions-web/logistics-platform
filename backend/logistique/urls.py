"""
URL configuration for logistique project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# Le fichier reste identique, juste le dossier s'appelle logistique/
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/commandes/', include('commandes.urls')),  
    path('api/tarifs/', include('tarif.urls')),
    path('api/recommandation/',  include('recommandation.urls')),
    path('api/entreprise/',  include('entreprise.urls')),

    path("api/notifications/", include("notifications.urls")),  # ✅ ajouter
path('api/retours/', include('retours.urls')),
path('api/notifications-client/', include('notifications_client.urls')),




]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

