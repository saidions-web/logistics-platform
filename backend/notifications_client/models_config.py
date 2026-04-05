from django.db import models
from django.conf import settings


class ConfigNotificationVendeur(models.Model):
    """
    US-33 — Configuration du canal de notification choisi par le vendeur.
    """
    vendeur = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='config_notification',
        limit_choices_to={'role': 'vendeur'},
    )
    canal = models.CharField(
        max_length=10,
        choices=[('email', 'Email'), ('sms', 'SMS'), ('both', 'Email + SMS')],
        default='both',
        verbose_name="Canal de notification",
    )
    modele_email = models.TextField(
        blank=True,
        verbose_name="Modèle email personnalisé",
        help_text="Laissez vide pour utiliser le modèle par défaut.",
    )
    modele_sms = models.CharField(
        max_length=160,
        blank=True,
        verbose_name="Modèle SMS personnalisé",
        help_text="Maximum 160 caractères.",
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Config notification vendeur"
        verbose_name_plural = "Configs notifications vendeurs"

    def __str__(self):
        return f"{self.vendeur.email} — {self.canal}"