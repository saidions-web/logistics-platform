from django.db import models
from accounts.models import CustomUser, EntrepriseProfile
from commandes.models import StatutCommande


# ─────────────────────────────────────────
# CONSTANTES
# ─────────────────────────────────────────

class StatutLivreur(models.TextChoices):
    DISPONIBLE = 'disponible', 'Disponible'
    EN_TOURNEE = 'en_tournee', 'En tournée'
    INACTIF    = 'inactif',    'Inactif'


# ─────────────────────────────────────────
# LIVREUR
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
        # On utilise une string pour éviter le circular import avec l'app 'tournees'
        return self.tournees.filter(statut='en_cours').count()