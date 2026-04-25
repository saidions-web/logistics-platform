from django.db import models
from accounts.models import EntrepriseProfile
from entreprise.models import Livreur
from commandes.models import Commande, StatutCommande, GOUVERNORATS
 
 
# ─────────────────────────────────────────
# CONSTANTES
# ─────────────────────────────────────────
 
class StatutTournee(models.TextChoices):
    PLANIFIEE = 'planifiee', 'Planifiée'
    EN_COURS  = 'en_cours',  'En cours'
    TERMINEE  = 'terminee',  'Terminée'
    ANNULEE   = 'annulee',   'Annulée'
 
 
# ─────────────────────────────────────────
# 1. TOURNÉE
# ─────────────────────────────────────────
 
class Tournee(models.Model):
    """
    Tournée de livraison assignée à un livreur.
    """
    entreprise = models.ForeignKey(
        EntrepriseProfile,
        on_delete=models.CASCADE,
        related_name='tournees',
        verbose_name="Entreprise"
    )
    livreur = models.ForeignKey(
        Livreur,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tournees',
        verbose_name="Livreur"
    )
 
    reference = models.CharField(
        max_length=20, unique=True, editable=False,
        verbose_name="Référence tournée"
    )
 
    date_prevue  = models.DateField(verbose_name="Date prévue")
    heure_depart = models.TimeField(null=True, blank=True, verbose_name="Heure de départ")
 
    zone_gouvernorat = models.CharField(
        max_length=50, choices=GOUVERNORATS,
        verbose_name="Zone principale"
    )
 
    statut = models.CharField(
        max_length=20,
        choices=StatutTournee.choices,
        default=StatutTournee.PLANIFIEE,
        verbose_name="Statut"
    )
 
    notes = models.TextField(blank=True, verbose_name="Notes")
 
    # Horodatages réels (remplis par l'app mobile quand le livreur démarre/termine)
    heure_depart_reelle = models.DateTimeField(null=True, blank=True, verbose_name="Heure de départ réelle")
    heure_fin_reelle    = models.DateTimeField(null=True, blank=True, verbose_name="Heure de fin réelle")
 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
 
    class Meta:
        verbose_name        = "Tournée"
        verbose_name_plural = "Tournées"
        ordering            = ['-date_prevue']
 
    def save(self, *args, **kwargs):
        if not self.reference:
            import uuid
            self.reference = f"TRN-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)
 
    def __str__(self):
        return f"{self.reference} — {self.zone_gouvernorat} ({self.date_prevue})"
 
    @property
    def nb_commandes(self):
        return self.affectations.count()
 
    @property
    def nb_livrees(self):
        return self.affectations.filter(
            commande__statut=StatutCommande.LIVREE
        ).count()
 
 
# ─────────────────────────────────────────
# 2. AFFECTATION COMMANDE → TOURNÉE
# ─────────────────────────────────────────
 
class AffectationCommande(models.Model):
    """
    Lie une commande à une tournée.
    """
    tournee  = models.ForeignKey(
        Tournee,
        on_delete=models.CASCADE,
        related_name='affectations',
        verbose_name="Tournée"
    )
    commande = models.ForeignKey(
        Commande,
        on_delete=models.CASCADE,
        related_name='affectations',
        verbose_name="Commande"
    )
    ordre    = models.PositiveSmallIntegerField(default=1, verbose_name="Ordre de livraison")
    notes    = models.TextField(blank=True, verbose_name="Notes")
 
    affectee_le = models.DateTimeField(auto_now_add=True)
 
    class Meta:
        verbose_name        = "Affectation"
        verbose_name_plural = "Affectations"
        ordering            = ['tournee', 'ordre']
        unique_together     = ['tournee', 'commande']
 
    def __str__(self):
        return f"{self.tournee.reference} → {self.commande.reference} (#{self.ordre})"