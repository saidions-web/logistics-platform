from django.db import models
from accounts.models import CustomUser, EntrepriseProfile
from commandes.models import Commande, GOUVERNORATS


# ─────────────────────────────────────────
# 1. GRILLE TARIFAIRE
# ─────────────────────────────────────────

    


# ─────────────────────────────────────────
# 2. RÉSULTAT DE RECOMMANDATION
# ─────────────────────────────────────────

class Recommandation(models.Model):
    """
    Résultat du scoring pour une commande donnée.
    Sauvegardé pour traçabilité et sélection manuelle.
    """
    commande = models.OneToOneField(
        Commande,
        on_delete=models.CASCADE,
        related_name='recommandation',
        verbose_name="Commande"
    )

    # Entreprise recommandée automatiquement
    entreprise_recommandee = models.ForeignKey(
        EntrepriseProfile,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='recommandations_recues',
        verbose_name="Entreprise recommandée"
    )

    # Entreprise finalement choisie (peut différer si sélection manuelle)
    entreprise_choisie = models.ForeignKey(
        EntrepriseProfile,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='commandes_choisies',
        verbose_name="Entreprise choisie"
    )

    # Résultats bruts du scoring (JSON)
    scores_details = models.JSONField(
        default=list,
        verbose_name="Détail des scores"
        # Format : [{ entreprise_id, nom, score_total, score_cout,
        #             score_delai, score_taux, score_zone, prix, delai_jours }, ...]
    )

    # Indicateur sélection manuelle
    selection_manuelle = models.BooleanField(
        default=False,
        verbose_name="Sélection manuelle"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = "Recommandation"
        verbose_name_plural = "Recommandations"

    def __str__(self):
        return f"Reco {self.commande.reference} → {self.entreprise_recommandee}"