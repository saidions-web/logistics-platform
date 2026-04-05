from django.db import models
from commandes.models import Commande


class CanalNotification(models.TextChoices):
    EMAIL = 'email', 'Email'
    SMS   = 'sms',   'SMS'
    BOTH  = 'both',  'Email + SMS'


class StatutEnvoi(models.TextChoices):
    ENVOYE = 'envoye', 'Envoye'
    ECHEC  = 'echec',  'Echec'


class NotificationClient(models.Model):
    commande     = models.ForeignKey(
        Commande,
        on_delete=models.CASCADE,
        related_name='notifications_client',
    )
    evenement    = models.CharField(max_length=30)
    canal        = models.CharField(max_length=10, choices=CanalNotification.choices)
    destinataire = models.CharField(max_length=255)
    message      = models.TextField()
    statut       = models.CharField(max_length=10, choices=StatutEnvoi.choices)
    erreur       = models.TextField(blank=True)
    envoye_le    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = "Notification client"
        verbose_name_plural = "Notifications client"
        ordering            = ['-envoye_le']

    def __str__(self):
        return f"[{self.canal}] {self.commande.reference} -> {self.destinataire} ({self.statut})"


class ConfigNotificationVendeur(models.Model):
    CANAL_CHOICES = [
        ('email', 'Email uniquement'),
        ('sms',   'SMS uniquement'),
        ('both',  'Email + SMS'),
        ('none',  'Desactive'),
    ]

    vendeur = models.OneToOneField(
        'accounts.CustomUser',
        on_delete=models.CASCADE,
        related_name='config_notification',
        limit_choices_to={'role': 'vendeur'},
    )
    canal        = models.CharField(max_length=10, choices=CANAL_CHOICES, default='both')
    modele_email = models.TextField(blank=True)
    modele_sms   = models.CharField(max_length=320, blank=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Config notification vendeur"

    def __str__(self):
        return f"Config notif - {self.vendeur} ({self.canal})"