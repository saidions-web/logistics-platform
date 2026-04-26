import logging
from django.conf import settings
from .models import NotificationClient, StatutEnvoi, CanalNotification

logger = logging.getLogger(__name__)


def _lien_suivi(commande):
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    return f"{base}/suivi?ref={commande.reference}"


def _normaliser_tel(telephone):
    tel = telephone.strip().replace(' ', '').replace('-', '')
    if tel.startswith('+'):
        return tel
    if tel.startswith('00'):
        return '+' + tel[2:]
    if tel.startswith('216'):
        return '+' + tel
    if tel.startswith('0'):
        return '+216' + tel[1:]
    return '+216' + tel


def _get_canal(commande):
    return 'sms'


def _envoyer_sms(commande, evenement, lien):
    telephone = commande.dest_telephone
    if not telephone:
        logger.info(f"[SMS] Pas de téléphone pour commande {commande.reference}")
        return

    tel = _normaliser_tel(telephone)

    try:
        nom_boutique = commande.vendeur.vendeur_profile.nom_boutique
    except Exception:
        nom_boutique = "LogiSync"

    message = (
        f"Bonjour {commande.dest_prenom}, "
        f"votre commande {commande.reference} de {nom_boutique} "
        f"est en cours de livraison. "
        f"Suivi : {lien}"
    )

    try:
        from twilio.rest import Client
        client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN
        )
        msg = client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=tel,
        )
        NotificationClient.objects.create(
            commande=commande,
            evenement=evenement,
            canal=CanalNotification.SMS,
            destinataire=tel,
            message=message,
            statut=StatutEnvoi.ENVOYE,
        )
        logger.info(
            f"[SMS] Envoyé → {tel} | "
            f"Commande: {commande.reference} | "
            f"SID={msg.sid}"
        )
    except Exception as e:
        NotificationClient.objects.create(
            commande=commande,
            evenement=evenement,
            canal=CanalNotification.SMS,
            destinataire=tel,
            message=message,
            statut=StatutEnvoi.ECHEC,
            erreur=str(e),
        )
        logger.error(f"[SMS] Échec pour {commande.reference} : {e}")


def notifier_client(commande, evenement):
    """
    Point d'entrée principal.
    Appelé par le signal post_save sur Commande (statut en_transit).
    """
    canal = _get_canal(commande)

    if canal == 'none':
        logger.info(f"[NOTIF] Canal désactivé pour vendeur {commande.vendeur_id}")
        return

    lien = _lien_suivi(commande)

    if canal in ('sms', 'both'):
        _envoyer_sms(commande, evenement, lien)