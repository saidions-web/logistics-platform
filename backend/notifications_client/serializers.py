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


def _get_canal(commande):
    try:
        return commande.vendeur.config_notification.canal
    except Exception:
        return 'both'


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
        logger.info(f"[SMS] Pas de telephone pour {commande.reference} - ignore")
        return

    tel      = _normaliser_tel(telephone)
    lien     = _lien_suivi(commande)
    boutique = _get_nom_boutique(commande)

    # Template personnalisé ou défaut
    message = None
    try:
        tpl = commande.vendeur.config_notification.modele_sms
        if tpl and tpl.strip():
            message = (
                tpl
                .replace('{reference}',   commande.reference)
                .replace('{prenom}',      commande.dest_prenom)
                .replace('{vendeur}',     boutique)
                .replace('{prestataire}', _get_nom_prestataire(commande))
                .replace('{lien_suivi}',  lien)
            )
    except Exception:
        pass

    if not message:
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
        logger.info(f"[SMS] OK {tel} pour {commande.reference} SID={msg.sid}")

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
        logger.error(f"[SMS] ECHEC {commande.reference} : {e}")


# ─────────────────────────────────────────
# ENVOI EMAIL
# ─────────────────────────────────────────

def _envoyer_email(commande, evenement):
    from django.core.mail import send_mail

    email = getattr(commande, 'dest_email', None)
    if not email:
        logger.info(f"[EMAIL] Pas d'email pour {commande.reference} - ignore")
        return

    boutique    = _get_nom_boutique(commande)
    prestataire = _get_nom_prestataire(commande)
    lien        = _lien_suivi(commande)
    sujet       = f"Votre commande {commande.reference} est en cours de livraison"

    corps_texte = (
        f"Bonjour {commande.dest_prenom} {commande.dest_nom},\n\n"
        f"Votre commande {commande.reference} passee aupres de {boutique} "
        f"est prise en charge par {prestataire} et est en cours de livraison.\n\n"
        f"Suivez-la en temps reel : {lien}\n\n"
        f"Cordialement,\n{boutique}"
    )

    corps_html = f"""
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
            <h2 style="color:#1E4D7B">Votre colis est en route !</h2>
            <p>Bonjour <strong>{commande.dest_prenom} {commande.dest_nom}</strong>,</p>
            <p>
                Votre commande <strong style="font-family:monospace">{commande.reference}</strong>
                passee aupres de <strong>{boutique}</strong>
                est prise en charge par <strong>{prestataire}</strong>
                et est en cours de livraison.
            </p>
            <div style="text-align:center;margin:32px 0">
                <a href="{lien}"
                   style="background:#1E4D7B;color:#fff;padding:14px 28px;
                          border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">
                    Suivre ma commande
                </a>
            </div>
        </div>
    """

    try:
        send_mail(
            subject=sujet,
            message=corps_texte,
            html_message=corps_html,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
        NotificationClient.objects.create(
            commande=commande,
            evenement=evenement,
            canal=CanalNotification.EMAIL,
            destinataire=email,
            message=corps_texte,
            statut=StatutEnvoi.ENVOYE,
        )
        logger.info(f"[EMAIL] OK {email} pour {commande.reference}")

    except Exception as e:
        NotificationClient.objects.create(
            commande=commande,
            evenement=evenement,
            canal=CanalNotification.EMAIL,
            destinataire=email,
            message=corps_texte,
            statut=StatutEnvoi.ECHEC,
            erreur=str(e),
        )
        logger.error(f"[EMAIL] ECHEC {commande.reference} : {e}")


# ─────────────────────────────────────────


# ─────────────────────────────────────────
# SERIALIZERS
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