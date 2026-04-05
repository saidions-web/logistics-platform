import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.utils import timezone
from datetime import timedelta

from .managers import CustomUserManager


# ─────────────────────────────────────────
# CONSTANTES — valeurs autorisées
# ─────────────────────────────────────────

class UserRole(models.TextChoices):
    VENDEUR    = 'vendeur',    'Vendeur'
    ENTREPRISE = 'entreprise', 'Entreprise de livraison'
    LIVREUR    = 'livreur',    'Livreur'
    ADMIN      = 'admin',      'Administrateur'


class SecteurActivite(models.TextChoices):
    MODE         = 'mode',         'Mode et Vetements'
    ELECTRONIQUE = 'electronique', 'Electronique'
    ALIMENTAIRE  = 'alimentaire',  'Alimentaire'
    BEAUTE       = 'beaute',       'Beaute et Cosmetiques'
    MAISON       = 'maison',       'Maison et Decoration'
    SPORT        = 'sport',        'Sport et Loisirs'
    AUTRE        = 'autre',        'Autre'


class FormeJuridique(models.TextChoices):
    SARL  = 'sarl',  'SARL'
    SA    = 'sa',    'SA'
    SUARL = 'suarl', 'SUARL'
    AUTRE = 'autre', 'Autre'


# ─────────────────────────────────────────
# 1. MODÈLE UTILISATEUR
# ─────────────────────────────────────────

class CustomUser(AbstractBaseUser, PermissionsMixin):
    email      = models.EmailField(unique=True, verbose_name="Email")
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name  = models.CharField(max_length=100, verbose_name="Nom")
    phone      = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VENDEUR,
        verbose_name="Rôle"
    )

    is_active         = models.BooleanField(default=True)
    is_staff          = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False, verbose_name="Email vérifié")
    is_approved       = models.BooleanField(default=False, verbose_name="Approuvé par l'admin")

    date_joined = models.DateTimeField(default=timezone.now)

    objects        = CustomUserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        verbose_name        = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering            = ['-date_joined']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def can_login(self):
        if self.role == UserRole.ENTREPRISE:
            return self.is_email_verified and self.is_approved
        return self.is_email_verified


# ─────────────────────────────────────────
# 2. PROFIL VENDEUR
# ─────────────────────────────────────────

class VendeurProfile(models.Model):
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name='vendeur_profile'
    )
    nom_boutique        = models.CharField(max_length=200, verbose_name="Nom de la boutique")
    secteur             = models.CharField(max_length=50, choices=SecteurActivite.choices, verbose_name="Secteur d'activité")
    volume_mensuel      = models.PositiveIntegerField(default=0, verbose_name="Volume mensuel estimé (colis)")
    adresse_expedition  = models.TextField(verbose_name="Adresse")
    gouvernorat         = models.CharField(max_length=100, verbose_name="Gouvernorat")
    delegation          = models.CharField(max_length=100, verbose_name="Délégation")
    numero_rc           = models.CharField(max_length=50, blank=True, verbose_name="Numéro RC")
    matricule           = models.CharField(max_length=50, blank=True, verbose_name="Matricule fiscal")
    site_web            = models.URLField(blank=True, verbose_name="Site web")
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Profil Vendeur"
        verbose_name_plural = "Profils Vendeurs"

    def __str__(self):
        return f"{self.nom_boutique} — {self.user.email}"


# ─────────────────────────────────────────
# 3. PROFIL ENTREPRISE DE LIVRAISON
# ─────────────────────────────────────────

class EntrepriseProfile(models.Model):
    user = models.OneToOneField(
        CustomUser, on_delete=models.CASCADE, related_name='entreprise_profile'
    )
    raison_sociale       = models.CharField(max_length=200, verbose_name="Raison sociale")
    forme_juridique      = models.CharField(max_length=20, choices=FormeJuridique.choices, verbose_name="Forme juridique")
    matricule_fiscal     = models.CharField(max_length=50, verbose_name="Matricule fiscal")
    annee_creation       = models.PositiveIntegerField(verbose_name="Année de création")
    adresse_siege        = models.TextField(verbose_name="Adresse du siège")
    gouvernorat          = models.CharField(max_length=100, verbose_name="Gouvernorat")
    responsable_nom      = models.CharField(max_length=100, verbose_name="Nom")
    responsable_prenom   = models.CharField(max_length=100, verbose_name="Prénom")
    responsable_poste    = models.CharField(max_length=100, verbose_name="Poste")
    responsable_tel      = models.CharField(max_length=20, verbose_name="Tél direct")
    nombre_livreurs      = models.PositiveIntegerField(default=0)
    capacite_journaliere = models.PositiveIntegerField(default=0, verbose_name="Capacité journalière (colis)")
    zones_couverture     = models.JSONField(default=list)
    types_colis_acceptes = models.JSONField(default=list)
    modes_livraison      = models.JSONField(default=list)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Profil Entreprise"
        verbose_name_plural = "Profils Entreprises"

    def __str__(self):
        return f"{self.raison_sociale} — {self.user.email}"


# ─────────────────────────────────────────
# 4. TOKEN DE VÉRIFICATION EMAIL
# ─────────────────────────────────────────

class EmailVerificationToken(models.Model):
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='verification_tokens'
    )
    token      = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used    = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Token de vérification"
        ordering     = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.pk:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    def is_valid(self):
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        status = "utilisé" if self.is_used else "en attente"
        return f"Token {self.user.email} ({status})"


# ─────────────────────────────────────────
# 5. TOKEN DE RÉINITIALISATION MOT DE PASSE  ← NOUVEAU
# ─────────────────────────────────────────

class PasswordResetToken(models.Model):
    """
    Token UUID envoyé par email pour réinitialiser le mot de passe.
    Expire après 1 heure. Marqué utilisé après reset.
    """
    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='password_reset_tokens'
    )
    token      = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used    = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Token de réinitialisation"
        ordering     = ['-created_at']

    def save(self, *args, **kwargs):
        # Expire après 1 heure
        if not self.pk:
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)

    def is_valid(self):
        """True si non expiré et non utilisé."""
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        status = "utilisé" if self.is_used else "en attente"
        return f"Reset {self.user.email} ({status})"