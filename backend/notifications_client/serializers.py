import logging
from django.conf import settings
from rest_framework import serializers
from .models import NotificationClient, StatutEnvoi, CanalNotification

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

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


def _get_nom_boutique(commande):
    try:
        return commande.vendeur.vendeur_profile.nom_boutique
    except Exception:
        nom = f"{commande.vendeur.first_name} {commande.vendeur.last_name}".strip()
        return nom or commande.vendeur.username


def _get_nom_prestataire(commande):
    try:
        return commande.recommandation.entreprise_choisie.raison_sociale
    except Exception:
        return "notre prestataire"


# ─────────────────────────────────────────
# ENVOI SMS
# ─────────────────────────────────────────

def _envoyer_sms(commande, evenement):
    telephone = commande.dest_telephone
    if not telephone:
        logger.info(f"[SMS] Pas de téléphone pour commande {commande.reference}")
        return

    tel      = _normaliser_tel(telephone)
    lien     = _lien_suivi(commande)
    boutique = _get_nom_boutique(commande)

    # Message par défaut
    message = (
        f"Bonjour {commande.dest_prenom}, "
        f"votre commande {commande.reference} de {boutique} "
        f"est en cours de livraison. "
        f"Suivi : {lien}"
    )

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
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
        logger.info(f"[SMS] Envoyé avec succès à {tel} | Commande: {commande.reference} | SID={msg.sid}")

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


# ─────────────────────────────────────────
# SERIALIZER
# ─────────────────────────────────────────

class NotificationClientSerializer(serializers.ModelSerializer):
    reference_commande = serializers.CharField(source='commande.reference', read_only=True)
    
    class Meta:
        model = NotificationClient
        fields = [
            'id',
            'commande_id',
            'reference_commande',
            'evenement',
            'canal',
            'destinataire',
            'message',
            'statut',
            'erreur',
            'envoye_le',
        ]
        read_only_fields = fields