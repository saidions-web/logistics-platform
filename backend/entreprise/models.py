from django.db import models
from django.utils import timezone
from accounts.models import CustomUser, EntrepriseProfile
from commandes.models import Commande, StatutCommande, GOUVERNORATS


# ─────────────────────────────────────────
# CONSTANTES
# ─────────────────────────────────────────

class StatutTournee(models.TextChoices):
    PLANIFIEE = 'planifiee', 'Planifiée'
    EN_COURS  = 'en_cours',  'En cours'
    TERMINEE  = 'terminee',  'Terminée'
    ANNULEE   = 'annulee',   'Annulée'


class StatutLivreur(models.TextChoices):
    DISPONIBLE = 'disponible', 'Disponible'
    EN_TOURNEE = 'en_tournee', 'En tournée'
    INACTIF    = 'inactif',    'Inactif'


# ─────────────────────────────────────────
# 1. LIVREUR
# ─────────────────────────────────────────

class Livreur(models.Model):
    """
    Livreur rattaché à une entreprise de livraison.
    Peut avoir un compte utilisateur (rôle livreur) ou juste un profil métier.
    """
    entreprise = models.ForeignKey(
        EntrepriseProfile,
        on_delete=models.CASCADE,
        related_name='livreurs',
        verbose_name="Entreprise"
    )
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='livreur_profile',
        limit_choices_to={'role': 'livreur'},
        verbose_name="Compte utilisateur"
    )

    # Infos personnelles
    nom    = models.CharField(max_length=100, verbose_name="Nom")
    prenom = models.CharField(max_length=100, verbose_name="Prénom")
    telephone = models.CharField(max_length=20, verbose_name="Téléphone")
    cin       = models.CharField(max_length=20, blank=True, verbose_name="CIN")

    # Zones couvertes
    gouvernorats_couverts = models.JSONField(
        default=list,
        verbose_name="Gouvernorats couverts"
    )

    # Véhicule
    type_vehicule    = models.CharField(max_length=50, blank=True, verbose_name="Type de véhicule")
    immatriculation  = models.CharField(max_length=20, blank=True, verbose_name="Immatriculation")

    statut = models.CharField(
        max_length=20,
        choices=StatutLivreur.choices,
        default=StatutLivreur.DISPONIBLE,
        verbose_name="Statut"
    )
    latitude          = models.FloatField(null=True, blank=True)
    longitude         = models.FloatField(null=True, blank=True)
    derniere_position = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Livreur"
        verbose_name_plural = "Livreurs"
        ordering            = ['nom', 'prenom']

    def __str__(self):
        return f"{self.prenom} {self.nom} — {self.entreprise.raison_sociale}"

    @property
    def nom_complet(self):
        return f"{self.prenom} {self.nom}"

    @property
    def nb_tournees_actives(self):
        return self.tournees.filter(statut=StatutTournee.EN_COURS).count()


# ─────────────────────────────────────────
# 2. TOURNÉE
# ─────────────────────────────────────────

class Tournee(models.Model):
    """
    Tournée de livraison assignée à un livreur.
    Regroupe plusieurs commandes à livrer.
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

    date_prevue = models.DateField(verbose_name="Date prévue")
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
# 3. AFFECTATION COMMANDE → TOURNÉE
# ─────────────────────────────────────────

class AffectationCommande(models.Model):
    """
    Lie une commande à une tournée.
    Permet de suivre l'ordre de livraison.
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
