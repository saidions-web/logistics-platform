import logging
from django.conf import settings
from .models import NotificationClient, StatutEnvoi, CanalNotification

logger = logging.getLogger(__name__)


def _lien_suivi(commande):
    base = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    return f"{base}/suivi?ref={commande.reference}"


def _normaliser_tel(telephone):
    """Convertit un numéro tunisien au format international E.164."""
    tel = telephone.replace(' ', '').replace('-', '')
    if tel.startswith('0'):
        return '+216' + tel[1:]
    if not tel.startswith('+'):
        return '+216' + tel
    return tel


def _get_canal(commande):
    """Retourne le canal configuré par le vendeur. Défaut : 'both'."""
    try:
        return commande.vendeur.config_notification.canal
    except Exception:
        return 'both'


# ── SMS ───────────────────────────────────────────────────────────────────────

def _envoyer_sms(commande, evenement, lien):
    try:
        nom_boutique = commande.vendeur.vendeur_profile.nom_boutique
    except:
        nom_boutique = "LogiSync"

    total = commande.montant_total

    message = (
        f"{nom_boutique} \n"
        f"Cmd: {commande.reference}\n"
        f"Total: {total:.2f} TND \n"
        
    )

    telephone = commande.dest_telephone
    if not telephone:
        return False

    tel = _normaliser_tel(telephone)

    try:
        from twilio.rest import Client

        client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN
        )

        client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=tel
        )

        return True

    except Exception as e:
        print("Erreur SMS:", e)
        return False


# ─────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────

def notifier_client(commande, evenement):
    """
    Main entry point for sending notifications.
    Dispatches to SMS and/or email based on vendor config.
    """
    canal = _get_canal(commande)

    if canal == 'none':
        logger.info(f"[NOTIF] Channel disabled for vendor {commande.vendeur_id}")
        return

    lien = _lien_suivi(commande)

    if canal in ('sms', 'both'):
        _envoyer_sms(commande, evenement, lien)

    # TODO: Add email sending if needed

    try:
        from twilio.rest import Client

        client = Client(
            settings.TWILIO_ACCOUNT_SID,
            settings.TWILIO_AUTH_TOKEN
        )

        client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=tel
        )

        return True

    except Exception as e:
        print("Erreur SMS:", e)
        return False