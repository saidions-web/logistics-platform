from django.db import models

from accounts.models import EntrepriseProfile

from commandes.models import GOUVERNORATS
 
 
class Tarif(models.Model):

    entreprise = models.ForeignKey(

        EntrepriseProfile,

        on_delete=models.CASCADE,

        related_name='tarifs'

    )
 
    gouvernorat = models.CharField(
        max_length=50,
        choices=GOUVERNORATS
    )
 
    poids_min = models.DecimalField(max_digits=6, decimal_places=3)

    poids_max = models.DecimalField(max_digits=6, decimal_places=3)
 
    prix = models.DecimalField(max_digits=10, decimal_places=3)
    delai_jours = models.IntegerField(default=3)
 
    created_at = models.DateTimeField(auto_now_add=True)
 
    class Meta:

        unique_together = ['entreprise', 'gouvernorat', 'poids_min', 'poids_max']
 
    def __str__(self):

        return f"{self.entreprise.raison_sociale} - {self.gouvernorat} ({self.poids_min}-{self.poids_max})"
 