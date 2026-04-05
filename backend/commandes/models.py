import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from accounts.models import CustomUser, EntrepriseProfile


class StatutCommande(models.TextChoices):
    EN_ATTENTE    = 'en_attente',    'En attente'
    PRISE_CHARGE  = 'prise_charge',  'Prise en charge'
    EN_TRANSIT    = 'en_transit',    'En transit'
    LIVREE        = 'livree',        'Livrée'
    RETOURNEE     = 'retournee',     'Retournée'
    ANNULEE       = 'annulee',       'Annulée'


class TypeLivraison(models.TextChoices):
    STANDARD    = 'standard',    'Standard'
    EXPRESS     = 'express',     'Express'
    


GOUVERNORATS = [
    ('Tunis', 'Tunis'), ('Ariana', 'Ariana'), ('Ben Arous', 'Ben Arous'),
    ('Manouba', 'Manouba'), ('Nabeul', 'Nabeul'), ('Zaghouan', 'Zaghouan'),
    ('Bizerte', 'Bizerte'), ('Béja', 'Béja'), ('Jendouba', 'Jendouba'),
    ('Kef', 'Kef'), ('Siliana', 'Siliana'), ('Sousse', 'Sousse'),
    ('Monastir', 'Monastir'), ('Mahdia', 'Mahdia'), ('Sfax', 'Sfax'),
    ('Kairouan', 'Kairouan'), ('Kasserine', 'Kasserine'),
    ('Sidi Bouzid', 'Sidi Bouzid'), ('Gabès', 'Gabès'),
    ('Médenine', 'Médenine'), ('Tataouine', 'Tataouine'),
    ('Gafsa', 'Gafsa'), ('Tozeur', 'Tozeur'), ('Kébili', 'Kébili'),
]


class Commande(models.Model):
    reference = models.CharField(max_length=20, unique=True, editable=False)
    vendeur = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='commandes',
        limit_choices_to={'role': 'vendeur'}
    )
    entreprise = models.ForeignKey(
        EntrepriseProfile,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='commandes'
    )

    dest_nom = models.CharField(max_length=100)
    dest_prenom = models.CharField(max_length=100)
    dest_telephone = models.CharField(max_length=20)
    dest_adresse = models.TextField()
    dest_gouvernorat = models.CharField(max_length=50, choices=GOUVERNORATS)

    type_livraison = models.CharField(
        max_length=20,
        choices=TypeLivraison.choices,
        default=TypeLivraison.STANDARD
    )

    montant_a_collecter = models.DecimalField(max_digits=10, decimal_places=3)
    prix_livraison = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal('0'))
    statut = models.CharField(
        max_length=20,
        choices=StatutCommande.choices,
        default=StatutCommande.EN_ATTENTE
    )
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calcul_prix_livraison(self):
        from tarif.models import Tarif
        from decimal import Decimal as D
        
        # Si pas d'entreprise, retourner 0 (sera recalculé après assignation)
        if not self.entreprise:
            return D('0')
        
        poids = self.poids_total or D('0')

        tarif = Tarif.objects.filter(
            entreprise=self.entreprise,
            gouvernorat=self.dest_gouvernorat,
            poids_min__lte=poids,
            poids_max__gte=poids
        ).first()

        # Si pas de tarif, retourner 10 TND par défaut (fallback)
        if not tarif:
            return D('10')
        
        prix = D(str(tarif.prix))
        if self.type_livraison == TypeLivraison.EXPRESS:
            prix += D('5')
        if self.colis.filter(fragile=True).exists():
            prix += D('2')
        return prix

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"CMD-{uuid.uuid4().hex[:8].upper()}"
        if not self.prix_livraison or self.prix_livraison == Decimal('0'):
            self.prix_livraison = self.calcul_prix_livraison()
        super().save(*args, **kwargs)

    @property
    def montant_total(self):
        return (self.montant_a_collecter or Decimal('0')) + (self.prix_livraison or Decimal('0'))

    @property
    def nombre_colis(self):
        return self.colis.count()

    @property
    def poids_total(self):
        if not self.pk:
            return Decimal('0')
        return sum((c.poids for c in self.colis.all()), Decimal('0'))

    def __str__(self):
        return self.reference


class Colis(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='colis')
    description = models.CharField(max_length=200)
    poids = models.DecimalField(max_digits=6, decimal_places=3)
    fragile = models.BooleanField(default=False)

    def __str__(self):
        return self.description


class HistoriqueStatut(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='historique')
    ancien_statut = models.CharField(max_length=20, choices=StatutCommande.choices)
    nouveau_statut = models.CharField(max_length=20, choices=StatutCommande.choices)
    commentaire = models.TextField(blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.commande.reference} : {self.ancien_statut} → {self.nouveau_statut}"