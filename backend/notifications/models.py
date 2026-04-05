from django.db import models
from accounts.models import CustomUser


class Notification(models.Model):
    """
    Notification interne envoyée à un utilisateur de la plateforme.
    Utilisée pour alerter vendeurs et entreprises des événements liés aux commandes.
    """
    utilisateur = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Destinataire"
    )
    titre = models.CharField(max_length=255, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    is_read = models.BooleanField(default=False, verbose_name="Lu")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Date de création")

    class Meta:
        verbose_name        = "Notification"
        verbose_name_plural = "Notifications"
        ordering            = ["-created_at"]

    def __str__(self):
        return f"[{'Lu' if self.is_read else 'Non lu'}] {self.titre} → {self.utilisateur}"