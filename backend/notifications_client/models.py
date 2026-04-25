from django.db import models
from commandes.models import Commande


class CanalNotification(models.TextChoices):
    SMS = 'sms', 'SMS'


class StatutEnvoi(models.TextChoices):
    ENVOYE = 'envoye', 'Envoyé'
    ECHEC  = 'echec',  'Échec'


class NotificationClient(models.Model):
    commande     = models.ForeignKey(
        Commande,
        on_delete=models.CASCADE,
        related_name='notifications_client',
    )
    evenement    = models.CharField(max_length=30)
    canal        = models.CharField(max_length=10, choices=CanalNotification.choices, default='sms')
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
        return f"[SMS] {self.commande.reference} → {self.destinataire} ({self.statut})"