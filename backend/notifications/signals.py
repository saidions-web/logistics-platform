from django.db.models.signals import post_save
from django.dispatch import receiver
from commandes.models import Commande, StatutCommande
from .models import Notification


@receiver(post_save, sender=Commande)
def create_notification(sender, instance, created, **kwargs):

    # ─── Nouvelle commande créée → notifier le vendeur ───
    if created:
        Notification.objects.create(
            utilisateur=instance.vendeur,
            titre="Nouvelle commande créée",
            message=f"Votre commande {instance.reference} a été créée avec succès."
        )
        return

    # ─── Commande prise en charge → notifier l'entreprise via Recommandation ───
    if instance.statut == StatutCommande.PRISE_CHARGE:
        # L'entreprise choisie est stockée dans la Recommandation liée
        try:
            reco = instance.recommandation
            if reco and reco.entreprise_choisie:
                Notification.objects.create(
                    utilisateur=reco.entreprise_choisie.user,
                    titre="Commande prise en charge",
                    message=(
                        f"La commande {instance.reference} est maintenant "
                        f"prise en charge par votre équipe."
                    )
                )
        except Exception:
            pass  # Pas de recommandation liée, on ignore

    # ─── Commande en transit → notifier le vendeur ───
    elif instance.statut == StatutCommande.EN_TRANSIT:
        Notification.objects.create(
            utilisateur=instance.vendeur,
            titre="Commande en transit",
            message=f"La commande {instance.reference} est en cours de livraison."
        )

    # ─── Commande livrée → notifier le vendeur ───
    elif instance.statut == StatutCommande.LIVREE:
        Notification.objects.create(
            utilisateur=instance.vendeur,
            titre="Commande livrée ✓",
            message=f"La commande {instance.reference} a été livrée avec succès."
        )

    # ─── Commande retournée → notifier le vendeur ───
    elif instance.statut == StatutCommande.RETOURNEE:
        Notification.objects.create(
            utilisateur=instance.vendeur,
            titre="Commande retournée",
            message=f"La commande {instance.reference} a été retournée."
        )

    # ─── Commande annulée → notifier le vendeur ───
    elif instance.statut == StatutCommande.ANNULEE:
        Notification.objects.create(
            utilisateur=instance.vendeur,
            titre="Commande annulée",
            message=f"La commande {instance.reference} a été annulée."
        )