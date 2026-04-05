from rest_framework.views     import APIView
from rest_framework.response  import Response
from rest_framework           import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterVendeurSerializer,
    RegisterEntrepriseSerializer,
    LoginSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    UpdateProfileSerializer,
    ChangePasswordSerializer,
    UpdateVendeurProfileSerializer,
    UpdateEntrepriseProfileSerializer,
)
from .models import EmailVerificationToken


# ─────────────────────────────────────────
#  INSCRIPTION
# ─────────────────────────────────────────

class RegisterVendeurView(APIView):
    """POST /api/auth/register/vendeur/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterVendeurSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Compte créé. Vérifiez votre email pour activer votre compte."},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterEntrepriseView(APIView):
    """POST /api/auth/register/entreprise/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterEntrepriseSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Demande reçue. Vérifiez votre email puis attendez la validation admin."},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  VÉRIFICATION EMAIL
# ─────────────────────────────────────────

class VerifyEmailView(APIView):
    """GET /api/auth/verify-email/?token=xxxx"""
    permission_classes = [AllowAny]

    def get(self, request):
        token_value = request.query_params.get('token')

        if not token_value:
            return Response({"error": "Token manquant."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = EmailVerificationToken.objects.get(token=token_value)
        except EmailVerificationToken.DoesNotExist:
            return Response({"error": "Token invalide."}, status=status.HTTP_400_BAD_REQUEST)

        if not token.is_valid():
            return Response({"error": "Token expiré ou déjà utilisé."}, status=status.HTTP_400_BAD_REQUEST)

        token.is_used = True
        token.user.is_email_verified = True
        token.save()
        token.user.save()

        return Response(
            {"message": "Email vérifié. Vous pouvez maintenant vous connecter."},
            status=status.HTTP_200_OK
        )


class ResendVerificationView(APIView):
    """POST /api/auth/resend-verification/"""
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import CustomUser

        email = request.data.get('email', '').lower()
        try:
            user  = CustomUser.objects.get(email=email)
            token = EmailVerificationToken.objects.create(user=user)
            s = RegisterVendeurSerializer()
            s._send_verification_email(user, token)
        except Exception:
            pass

        return Response(
            {"message": "Si cet email existe, un lien de vérification a été envoyé."},
            status=status.HTTP_200_OK
        )


# ─────────────────────────────────────────
#  LOGIN / LOGOUT
# ─────────────────────────────────────────

class LoginView(APIView):
    """POST /api/auth/login/"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user    = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            return Response({
                'access' : str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id'   : user.id,
                    'email': user.email,
                    'nom'  : user.get_full_name(),
                    'role' : user.role,
                }
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """POST /api/auth/logout/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Déconnexion réussie."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"error": "Token invalide."}, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  MON PROFIL
# ─────────────────────────────────────────

class MeView(APIView):
    """
    GET  /api/auth/me/        → voir son profil
    PATCH /api/auth/me/       → modifier prénom, nom, téléphone
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'id'               : user.id,
            'email'            : user.email,
            'first_name'       : user.first_name,
            'last_name'        : user.last_name,
            'phone'            : user.phone,
            'role'             : user.role,
            'is_email_verified': user.is_email_verified,
            'date_joined'      : user.date_joined,
        }
        if user.role == 'vendeur' and hasattr(user, 'vendeur_profile'):
            p = user.vendeur_profile
            data['profile'] = {
                'nom_boutique'  : p.nom_boutique,
                'secteur'       : p.secteur,
                'gouvernorat'   : p.gouvernorat,
                'volume_mensuel': p.volume_mensuel,
            }
        elif user.role == 'entreprise' and hasattr(user, 'entreprise_profile'):
            p = user.entreprise_profile
            data['profile'] = {
                'raison_sociale' : p.raison_sociale,
                'gouvernorat'    : p.gouvernorat,
                'nombre_livreurs': p.nombre_livreurs,
            }
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request):
        # PATCH = mise à jour partielle (seulement les champs envoyés)
        serializer = UpdateProfileSerializer(
            instance=request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Profil mis à jour avec succès."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  CHANGEMENT MOT DE PASSE (US-04)
# ─────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Body : { "old_password": "...", "new_password": "...", "confirm_password": "..." }
    → L'utilisateur connecté change son mot de passe.
    → Il doit fournir son ancien mot de passe.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}  # nécessaire pour accéder à request.user dans le serializer
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Mot de passe changé avec succès."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  MOT DE PASSE OUBLIÉ                    ← NOUVEAU
# ─────────────────────────────────────────

class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/
    Body : { "email": "user@exemple.com" }
    → Envoie un email avec un lien de reset valable 1 heure.
    → Retourne toujours 200 (sécurité : ne pas révéler si l'email existe).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
        # On retourne toujours 200 même si l'email n'existe pas
        return Response(
            {"message": "Si cet email est associé à un compte, vous recevrez un lien de réinitialisation."},
            status=status.HTTP_200_OK
        )


class ResetPasswordView(APIView):
    """
    POST /api/auth/reset-password/
    Body : { "token": "uuid...", "password": "nouveauMotDePasse" }
    → Vérifie le token, met à jour le mot de passe.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"message": "Mot de passe mis à jour avec succès. Vous pouvez maintenant vous connecter."},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ─────────────────────────────────────────
#  PROFIL MÉTIER — VENDEUR (US-04)
# ─────────────────────────────────────────

class VendeurProfileView(APIView):
    """
    GET   /api/auth/me/vendeur/  → voir les infos boutique
    PATCH /api/auth/me/vendeur/  → modifier les infos boutique
    Réservé aux users avec role='vendeur'.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'vendeur':
            return Response({"error": "Accès réservé aux vendeurs."}, status=status.HTTP_403_FORBIDDEN)
        if not hasattr(request.user, 'vendeur_profile'):
            return Response({"error": "Profil vendeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        p = request.user.vendeur_profile
        return Response({
            'nom_boutique'      : p.nom_boutique,
            'secteur'           : p.secteur,
            'gouvernorat'       : p.gouvernorat,
            'delegation'        : p.delegation,
            'adresse_expedition': p.adresse_expedition,
            'volume_mensuel'    : p.volume_mensuel,
            'site_web'          : p.site_web,
            'numero_rc'         : p.numero_rc,
            'matricule'         : p.matricule,
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        if request.user.role != 'vendeur':
            return Response({"error": "Accès réservé aux vendeurs."}, status=status.HTTP_403_FORBIDDEN)
        if not hasattr(request.user, 'vendeur_profile'):
            return Response({"error": "Profil vendeur introuvable."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateVendeurProfileSerializer(
            instance=request.user.vendeur_profile,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profil boutique mis à jour avec succès."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────
#  PROFIL MÉTIER — ENTREPRISE (US-04)
# ─────────────────────────────────────────

class EntrepriseProfileView(APIView):
    """
    GET   /api/auth/me/entreprise/  → voir les infos entreprise
    PATCH /api/auth/me/entreprise/  → modifier les infos entreprise
    Réservé aux users avec role='entreprise'.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'entreprise':
            return Response({"error": "Accès réservé aux entreprises."}, status=status.HTTP_403_FORBIDDEN)
        if not hasattr(request.user, 'entreprise_profile'):
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)

        p = request.user.entreprise_profile
        return Response({
            'raison_sociale'    : p.raison_sociale,
            'gouvernorat'       : p.gouvernorat,
            'adresse_siege'     : p.adresse_siege,
            'responsable_tel'   : p.responsable_tel,
            'responsable_poste' : p.responsable_poste,
            'nombre_livreurs'   : p.nombre_livreurs,
            'capacite_journaliere': p.capacite_journaliere,
            'zones_couverture'  : p.zones_couverture,
            'modes_livraison'   : p.modes_livraison,
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        if request.user.role != 'entreprise':
            return Response({"error": "Accès réservé aux entreprises."}, status=status.HTTP_403_FORBIDDEN)
        if not hasattr(request.user, 'entreprise_profile'):
            return Response({"error": "Profil entreprise introuvable."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateEntrepriseProfileSerializer(
            instance=request.user.entreprise_profile,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Profil entreprise mis à jour avec succès."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)