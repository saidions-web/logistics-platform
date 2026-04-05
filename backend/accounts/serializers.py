from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
import re
from .models import CustomUser, VendeurProfile, EntrepriseProfile, EmailVerificationToken, PasswordResetToken


# ─────────────────────────────────────────
# 1. INSCRIPTION VENDEUR
# ─────────────────────────────────────────

class RegisterVendeurSerializer(serializers.Serializer):
    email      = serializers.EmailField()
    password   = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=100)
    last_name  = serializers.CharField(max_length=100)
    phone      = serializers.CharField(max_length=20, required=False, default='')
    nom_boutique   = serializers.CharField(max_length=200)
    secteur        = serializers.ChoiceField(choices=[
        ('mode','Mode'),('electronique','Electronique'),('alimentaire','Alimentaire'),
        ('beaute','Beaute'),('maison','Maison'),('sport','Sport'),('autre','Autre'),
    ])
    volume_mensuel     = serializers.IntegerField(min_value=0, default=0, required=False)
    adresse_expedition = serializers.CharField()
    gouvernorat        = serializers.CharField(max_length=100)
    delegation         = serializers.CharField(max_length=100)
    numero_rc          = serializers.CharField(max_length=50, required=False, default='')
    matricule          = serializers.CharField(max_length=50, required=False, default='')
    site_web           = serializers.URLField(required=False, default='')

    def validate_email(self, value):
        value = value.lower().strip()
        if not value:
            raise serializers.ValidationError("L'email est requis")
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé")
        if len(value) > 255:
            raise serializers.ValidationError("L'email ne peut pas dépasser 255 caractères")
        return value

    def validate_password(self, value):
        if not value or len(value) < 8:
            raise serializers.ValidationError("Le mot de passe doit contenir au moins 8 caractères")
        validate_password(value)
        return value

    def validate_first_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le prénom est requis")
        if len(value) < 2:
            raise serializers.ValidationError("Le prénom doit contenir au moins 2 caractères")
        if len(value) > 100:
            raise serializers.ValidationError("Le prénom ne peut pas dépasser 100 caractères")
        return value.strip().title()

    def validate_last_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom est requis")
        if len(value) < 2:
            raise serializers.ValidationError("Le nom doit contenir au moins 2 caractères")
        if len(value) > 100:
            raise serializers.ValidationError("Le nom ne peut pas dépasser 100 caractères")
        return value.strip().upper()

    def validate_phone(self, value):
        if value:
            tel = value.replace(' ', '').replace('-', '').replace('.', '')
            # Téléphone tunisien : +216 XX XXX XXX ou 0X XXX XXX (8 chiffres)
            if not re.match(r'^(\+216|0|216)?[0-9]{8}$', tel):
                raise serializers.ValidationError("Le numéro doit être au format tunisien avec 8 chiffres (ex: 0X XXX XXX ou +216 XX XXX XXX)")
        return value.strip() if value else ''

    def validate_nom_boutique(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom de la boutique est requis")
        if len(value) < 3:
            raise serializers.ValidationError("Le nom doit contenir au moins 3 caractères")
        if len(value) > 200:
            raise serializers.ValidationError("Le nom ne peut pas dépasser 200 caractères")
        return value.strip()

    def validate_adresse_expedition(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("L'adresse d'expédition est requise")
        if len(value) < 10:
            raise serializers.ValidationError("L'adresse doit contenir au moins 10 caractères")
        if len(value) > 255:
            raise serializers.ValidationError("L'adresse ne peut pas dépasser 255 caractères")
        return value.strip()

    def validate_gouvernorat(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le gouvernorat est requis")
        return value.strip()

    def validate_delegation(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La délégation est requise")
        if len(value) < 2:
            raise serializers.ValidationError("La délégation doit contenir au moins 2 caractères")
        return value.strip()

    def validate_volume_mensuel(self, value):
        if value < 0:
            raise serializers.ValidationError("Le volume mensuel ne peut pas être négatif")
        if value > 1000000:
            raise serializers.ValidationError("Le volume mensuel semble introitement élevé")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            profile_fields = [
                'nom_boutique','secteur','volume_mensuel',
                'adresse_expedition','gouvernorat','delegation',
                'numero_rc','matricule','site_web',
            ]
            profile_data = {k: validated_data.pop(k) for k in profile_fields}
            user = CustomUser.objects.create_user(
                email=validated_data['email'], password=validated_data['password'],
                first_name=validated_data['first_name'], last_name=validated_data['last_name'],
                phone=validated_data.get('phone',''), role='vendeur',
            )
            VendeurProfile.objects.create(user=user, **profile_data)
            token = EmailVerificationToken.objects.create(user=user)
        self._send_verification_email(user, token)
        return user

    def _send_verification_email(self, user, token):
        link = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
        try:
            send_mail(
                subject="Activez votre compte LogiSync",
                message=(
                    f"Bonjour {user.first_name},\n\n"
                    f"Cliquez sur ce lien pour activer votre compte :\n{link}\n\n"
                    f"Ce lien expire dans 24 heures.\n\nL'équipe LogiSync"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Échec envoi email à {user.email} : {e}")


# ─────────────────────────────────────────
# 2. INSCRIPTION ENTREPRISE
# ─────────────────────────────────────────

class RegisterEntrepriseSerializer(serializers.Serializer):
    email      = serializers.EmailField()
    password   = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=100)
    last_name  = serializers.CharField(max_length=100)
    phone      = serializers.CharField(max_length=20, required=False, default='')
    raison_sociale   = serializers.CharField(max_length=200)
    forme_juridique  = serializers.ChoiceField(choices=[
        ('sarl','SARL'),('sa','SA'),('suarl','SUARL'),('autre','Autre')
    ])
    matricule_fiscal = serializers.CharField(max_length=50)
    annee_creation   = serializers.IntegerField(min_value=1900)
    adresse_siege    = serializers.CharField()
    gouvernorat      = serializers.CharField(max_length=100)
    responsable_nom    = serializers.CharField(max_length=100)
    responsable_prenom = serializers.CharField(max_length=100)
    responsable_poste  = serializers.CharField(max_length=100)
    responsable_tel    = serializers.CharField(max_length=20)
    nombre_livreurs      = serializers.IntegerField(min_value=0, default=0, required=False)
    capacite_journaliere = serializers.IntegerField(min_value=0, default=0, required=False)
    zones_couverture     = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    types_colis_acceptes = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    modes_livraison      = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    def validate_email(self, value):
        value = value.lower().strip()
        if not value:
            raise serializers.ValidationError("L'email est requis")
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé")
        return value

    def validate_password(self, value):
        if not value or len(value) < 8:
            raise serializers.ValidationError("Le mot de passe doit contenir au moins 8 caractères")
        validate_password(value)
        return value

    def validate_first_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le prénom est requis")
        if len(value) < 2 or len(value) > 100:
            raise serializers.ValidationError("Le prénom doit contenir entre 2 et 100 caractères")
        return value.strip().title()

    def validate_last_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom est requis")
        if len(value) < 2 or len(value) > 100:
            raise serializers.ValidationError("Le nom doit contenir entre 2 et 100 caractères")
        return value.strip().upper()

    def validate_phone(self, value):
        if value:
            tel = value.replace(' ', '').replace('-', '').replace('.', '')
            # Téléphone tunisien : +216 XX XXX XXX ou 0X XXX XXX (8 chiffres)
            if not re.match(r'^(\+216|0|216)?[0-9]{8}$', tel):
                raise serializers.ValidationError("Le numéro doit être au format tunisien avec 8 chiffres (ex: 0X XXX XXX ou +216 XX XXX XXX)")
        return value.strip() if value else ''

    def validate_raison_sociale(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La raison sociale est requise")
        if len(value) < 3 or len(value) > 200:
            raise serializers.ValidationError("La raison sociale doit contenir entre 3 et 200 caractères")
        return value.strip()

    def validate_matricule_fiscal(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le matricule fiscal est requis")
        if len(value) < 5 or len(value) > 50:
            raise serializers.ValidationError("Le matricule fiscal doit contenir entre 5 et 50 caractères")
        return value.strip().upper()

    def validate_annee_creation(self, value):
        from datetime import datetime
        current_year = datetime.now().year
        if value < 1900 or value > current_year:
            raise serializers.ValidationError(f"L'année doit être entre 1900 et {current_year}")
        return value

    def validate_adresse_siege(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("L'adresse du siège est requise")
        if len(value) < 10 or len(value) > 255:
            raise serializers.ValidationError("L'adresse doit contenir entre 10 et 255 caractères")
        return value.strip()

    def validate_gouvernorat(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le gouvernorat est requis")
        return value.strip()

    def validate_responsable_nom(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom du responsable est requis")
        if len(value) < 2 or len(value) > 100:
            raise serializers.ValidationError("Le nom doit contenir entre 2 et 100 caractères")
        return value.strip().title()

    def validate_responsable_prenom(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le prénom du responsable est requis")
        if len(value) < 2 or len(value) > 100:
            raise serializers.ValidationError("Le prénom doit contenir entre 2 et 100 caractères")
        return value.strip().title()

    def validate_responsable_poste(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le poste du responsable est requis")
        if len(value) < 2 or len(value) > 100:
            raise serializers.ValidationError("Le poste doit contenir entre 2 et 100 caractères")
        return value.strip()

    def validate_responsable_tel(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le téléphone du responsable est requis")
        tel = value.replace(' ', '').replace('-', '').replace('.', '')
        # Téléphone tunisien : +216 XX XXX XXX ou 0X XXX XXX (8 chiffres)
        if not re.match(r'^(\+216|0|216)?[0-9]{8}$', tel):
            raise serializers.ValidationError("Le numéro doit être au format tunisien avec 8 chiffres (ex: 0X XXX XXX ou +216 XX XXX XXX)")
        return value.strip()

    def validate_nombre_livreurs(self, value):
        if value < 0:
            raise serializers.ValidationError("Le nombre de livreurs ne peut pas être négatif")
        if value > 10000:
            raise serializers.ValidationError("Le nombre de livreurs semble élevé pour une entreprise")
        return value

    def validate_capacite_journaliere(self, value):
        if value < 0:
            raise serializers.ValidationError("La capacité journalière ne peut pas être négative")
        if value > 1000000:
            raise serializers.ValidationError("La capacité journalière semble élevée")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            profile_fields = [
                'raison_sociale','forme_juridique','matricule_fiscal','annee_creation',
                'adresse_siege','gouvernorat',
                'responsable_nom','responsable_prenom','responsable_poste','responsable_tel',
                'nombre_livreurs','capacite_journaliere',
                'zones_couverture','types_colis_acceptes','modes_livraison',
            ]
            profile_data = {k: validated_data.pop(k) for k in profile_fields}
            user = CustomUser.objects.create_user(
                email=validated_data['email'], password=validated_data['password'],
                first_name=validated_data['first_name'], last_name=validated_data['last_name'],
                phone=validated_data.get('phone',''), role='entreprise',
            )
            EntrepriseProfile.objects.create(user=user, **profile_data)
            token = EmailVerificationToken.objects.create(user=user)
        self._send_verification_email(user, token)
        return user

    def _send_verification_email(self, user, token):
        link = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
        try:
            send_mail(
                subject="Activez votre compte LogiSync",
                message=(
                    f"Bonjour {user.first_name},\n\n"
                    f"Votre demande d'inscription a bien été reçue.\n"
                    f"Cliquez sur ce lien pour confirmer votre email :\n{link}\n\n"
                    f"Note : votre compte sera ensuite soumis à validation.\n\nL'équipe LogiSync"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Échec envoi email à {user.email} : {e}")


# ─────────────────────────────────────────
# 3. LOGIN
# ─────────────────────────────────────────

from django.contrib.auth import authenticate

class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email    = data.get('email').lower()
        password = data.get('password')
        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Email ou mot de passe incorrect.")
        if not user.is_email_verified:
            raise serializers.ValidationError("Veuillez vérifier votre email avant de vous connecter.")
        if not user.is_active:
            raise serializers.ValidationError("Ce compte a été désactivé.")
        data['user'] = user
        return data


# ─────────────────────────────────────────
# 4. MOT DE PASSE OUBLIÉ — DEMANDE        ← NOUVEAU
# ─────────────────────────────────────────

class ForgotPasswordSerializer(serializers.Serializer):
    """
    POST /api/auth/forgot-password/
    Reçoit un email → génère un token → envoie un lien de reset.
    Retourne toujours succès pour ne pas révéler si l'email existe.
    """
    email = serializers.EmailField()

    def save(self):
        email = self.validated_data['email'].lower()
        try:
            user = CustomUser.objects.get(email=email)

            # Invalider tous les anciens tokens non utilisés
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

            # Créer un nouveau token (expire dans 1h)
            token = PasswordResetToken.objects.create(user=user)

            # Envoyer l'email
            self._send_reset_email(user, token)

        except CustomUser.DoesNotExist:
            pass  # Sécurité : ne pas révéler que l'email n'existe pas
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Échec reset password pour {email} : {e}")

    def _send_reset_email(self, user, token):
        link = f"{settings.FRONTEND_URL}/reset-password?token={token.token}"
        send_mail(
            subject="Réinitialisation de votre mot de passe LogiSync",
            message=(
                f"Bonjour {user.first_name},\n\n"
                f"Vous avez demandé à réinitialiser votre mot de passe.\n"
                f"Cliquez sur ce lien pour choisir un nouveau mot de passe :\n{link}\n\n"
                f"⚠️  Ce lien expire dans 1 heure.\n"
                f"Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n\n"
                f"L'équipe LogiSync"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )


# ─────────────────────────────────────────
# 5. MOT DE PASSE OUBLIÉ — RESET          ← NOUVEAU
# ─────────────────────────────────────────

class ResetPasswordSerializer(serializers.Serializer):
    """
    POST /api/auth/reset-password/
    Reçoit le token UUID + nouveau mot de passe → met à jour le mot de passe.
    """
    token    = serializers.UUIDField()
    password = serializers.CharField(write_only=True)

    def validate_token(self, value):
        try:
            token = PasswordResetToken.objects.get(token=value)
        except PasswordResetToken.DoesNotExist:
            raise serializers.ValidationError("Lien invalide ou expiré.")
        if not token.is_valid():
            raise serializers.ValidationError("Ce lien a expiré ou a déjà été utilisé.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def save(self):
        token_value  = self.validated_data['token']
        new_password = self.validated_data['password']

        token = PasswordResetToken.objects.get(token=token_value)
        user  = token.user

        # Mettre à jour le mot de passe
        user.set_password(new_password)
        user.save()

        # Invalider le token
        token.is_used = True
        token.save()

        return user


# ─────────────────────────────────────────
# 6. MISE À JOUR PROFIL (US-04)
# ─────────────────────────────────────────

class UpdateProfileSerializer(serializers.Serializer):
    """
    PATCH /api/auth/me/
    Permet à l'utilisateur connecté de modifier ses infos personnelles.
    Tous les champs sont optionnels (partial update).
    """
    first_name = serializers.CharField(max_length=100, required=False)
    last_name  = serializers.CharField(max_length=100, required=False)
    phone      = serializers.CharField(max_length=20,  required=False, allow_blank=True)

    def update(self, instance, validated_data):
        # instance = le user connecté (request.user)
        # On met à jour uniquement les champs envoyés
        instance.first_name = validated_data.get('first_name', instance.first_name)
        instance.last_name  = validated_data.get('last_name',  instance.last_name)
        instance.phone      = validated_data.get('phone',      instance.phone)
        instance.save()
        return instance


# ─────────────────────────────────────────
# 7. CHANGEMENT MOT DE PASSE (US-04)
# ─────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    """
    POST /api/auth/change-password/
    Permet à l'utilisateur connecté de changer son mot de passe.
    Il doit fournir son ancien mot de passe pour confirmer son identité.
    """
    old_password     = serializers.CharField(write_only=True)
    new_password     = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_old_password(self, value):
        # Vérifier que l'ancien mot de passe est correct
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate_new_password(self, value):
        # Vérifier que le nouveau mot de passe respecte les règles Django
        validate_password(value)
        return value

    def validate(self, data):
        # Vérifier que new_password == confirm_password
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': "Les mots de passe ne correspondent pas."
            })
        return data

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user

# ─────────────────────────────────────────
# 8. MISE À JOUR PROFIL VENDEUR (US-04)
# ─────────────────────────────────────────

class UpdateVendeurProfileSerializer(serializers.Serializer):
    """
    PATCH /api/auth/me/vendeur/
    Modifie les infos de la boutique du vendeur connecté.
    Tous les champs sont optionnels.
    """
    nom_boutique       = serializers.CharField(max_length=200, required=False)
    secteur            = serializers.ChoiceField(choices=[
        ('mode','Mode'),('electronique','Electronique'),('alimentaire','Alimentaire'),
        ('beaute','Beaute'),('maison','Maison'),('sport','Sport'),('autre','Autre'),
    ], required=False)
    gouvernorat        = serializers.CharField(max_length=100, required=False)
    delegation         = serializers.CharField(max_length=100, required=False)
    adresse_expedition = serializers.CharField(required=False)
    volume_mensuel     = serializers.IntegerField(min_value=0, required=False)
    site_web           = serializers.URLField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


# ─────────────────────────────────────────
# 9. MISE À JOUR PROFIL ENTREPRISE (US-04)
# ─────────────────────────────────────────

class UpdateEntrepriseProfileSerializer(serializers.Serializer):
    """
    PATCH /api/auth/me/entreprise/
    Modifie les infos de l'entreprise connectée.
    Tous les champs sont optionnels.
    """
    raison_sociale       = serializers.CharField(max_length=200, required=False)
    gouvernorat          = serializers.CharField(max_length=100, required=False)
    adresse_siege        = serializers.CharField(required=False)
    responsable_tel      = serializers.CharField(max_length=20, required=False)
    responsable_poste    = serializers.CharField(max_length=100, required=False)
    nombre_livreurs      = serializers.IntegerField(min_value=0, required=False)
    capacite_journaliere = serializers.IntegerField(min_value=0, required=False)
    zones_couverture     = serializers.ListField(child=serializers.CharField(), required=False)
    modes_livraison      = serializers.ListField(child=serializers.CharField(), required=False)

    def update(self, instance, validated_data):
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance