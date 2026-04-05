import threading
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction

from commandes.models import Commande, StatutCommande
from .models import NotificationClient

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Commande)
def envoyer_notif_si_transit(sender, instance, created, **kwargs):
    """
    Déclenche la notification client quand la commande passe en 'en_transit'.
    - Utilise transaction.on_commit pour attendre que le commit DB soit fait
    - Utilise un thread pour ne pas bloquer la requête HTTP
    """
    if created:
        return

    if instance.statut != StatutCommande.EN_TRANSIT:
        return

    # Capturer l'ID maintenant (instance peut changer après le thread)
    commande_id = instance.id

    def _envoyer():
        # Vérifier anti-doublon dans le thread
        deja_envoye = NotificationClient.objects.filter(
            commande_id=commande_id,
            evenement='en_transit',
            statut='envoye',
        ).exists()

        if deja_envoye:
            return

        # Recharger la commande depuis la DB (transaction committée)
        from commandes.models import Commande as Cmd
        try:
            commande = Cmd.objects.select_related('vendeur').get(pk=commande_id)
        except Cmd.DoesNotExist:
            return

        from .service import notifier_client
        try:
            notifier_client(commande, 'en_transit')
        except Exception as e:
            logger.error(f"[SIGNAL] Erreur notification {commande_id} : {e}")

    # ⚠️ on_commit garantit que la DB est committée avant l'envoi
    # Le thread évite de bloquer la réponse HTTP
    def _lancer_thread():
        t = threading.Thread(target=_envoyer, daemon=True)
        t.start()

    transaction.on_commit(_lancer_thread)