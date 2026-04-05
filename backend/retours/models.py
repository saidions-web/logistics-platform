from django.db import models
from commandes.models import Commande
from accounts.models import CustomUser


# ─────────────────────────────────────────
# CONSTANTES
# ─────────────────────────────────────────

class MotifRetour(models.TextChoices):
    CLIENT_ABSENT    = 'client_absent',    'Client absent'
    INJOIGNABLE      = 'injoignable',      'Injoignable'
    REFUS_CLIENT     = 'refus_client',     'Refus du client'
    ADRESSE_INVALIDE = 'adresse_invalide', 'Adresse invalide'
    AUTRE            = 'autre',            'Autre'


class StatutRetour(models.TextChoices):
    EN_COURS      = 'en_cours',      'En cours de retour'
    RECU_DEPOT    = 'recu_depot',    'Reçu au dépôt'
    REPROGRAMME   = 'reprogramme',   'Reprogrammé'
    ANNULE_FINAL  = 'annule_final',  'Annulé définitivement'


# ─────────────────────────────────────────
# MODÈLE RETOUR
# ─────────────────────────────────────────

class RetourCommande(models.Model):
    """
    Enregistre un retour de livraison pour une commande.
    Créé automatiquement quand une commande passe au statut RETOURNEE.
    """
    commande = models.OneToOneField(
        Commande,
        on_delete=models.CASCADE,
        related_name='retour',
        verbose_name="Commande"
    )

    motif = models.CharField(
        max_length=30,
        choices=MotifRetour.choices,
        verbose_name="Motif du retour"
    )

    commentaire = models.TextField(
        blank=True,
        verbose_name="Commentaire livreur"
    )

    statut = models.CharField(
        max_length=20,
        choices=StatutRetour.choices,
        default=StatutRetour.EN_COURS,
        verbose_name="Statut du retour"
    )

    # Décision du vendeur
    decision_vendeur = models.CharField(
        max_length=20,
        choices=[('reprogrammer', 'Reprogrammer'), ('annuler', 'Annuler')],
        blank=True,
        verbose_name="Décision vendeur"
    )
    notes_vendeur = models.TextField(
        blank=True,
        verbose_name="Notes vendeur"
    )

    date_retour     = models.DateTimeField(auto_now_add=True, verbose_name="Date du retour")
    date_decision   = models.DateTimeField(null=True, blank=True, verbose_name="Date de décision")
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Retour commande"
        verbose_name_plural = "Retours commandes"
        ordering            = ['-date_retour']

    def __str__(self):
        return f"Retour {self.commande.reference} — {self.get_motif_display()}"