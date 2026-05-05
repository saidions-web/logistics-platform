from rest_framework import serializers
from django.db import transaction

from .models import Tournee, AffectationCommande
from commandes.models import Commande, StatutCommande, HistoriqueStatut


# ─────────────────────────────────────────
# AFFECTATION (lecture)
# ─────────────────────────────────────────

class AffectationSerializer(serializers.ModelSerializer):
    commande_reference   = serializers.CharField(source='commande.reference',       read_only=True)
    commande_dest_nom    = serializers.CharField(source='commande.dest_nom',         read_only=True)
    commande_dest_prenom = serializers.CharField(source='commande.dest_prenom',      read_only=True)
    commande_gouvernorat = serializers.CharField(source='commande.dest_gouvernorat', read_only=True)
    commande_dest_adresse = serializers.CharField(source='commande.dest_adresse', read_only=True)
    commande_statut      = serializers.CharField(source='commande.statut',           read_only=True)
    commande_montant     = serializers.DecimalField(
        source='commande.montant_a_collecter',
        max_digits=10, decimal_places=3, read_only=True
    )
    commande_dest_telephone = serializers.CharField(source='commande.dest_telephone', read_only=True)

    class Meta:
        model  = AffectationCommande
        fields = [
            'id', 'ordre', 'notes',
            'commande', 'commande_reference',
            'commande_dest_nom', 'commande_dest_prenom',
            'commande_gouvernorat', 'commande_statut',
            'commande_montant', 'commande_dest_adresse',      
            'affectee_le', 'commande_dest_telephone',
        ]


# ─────────────────────────────────────────
# TOURNÉE
# ─────────────────────────────────────────

class TourneeSerializer(serializers.ModelSerializer):
    livreur_nom    = serializers.SerializerMethodField()
    nb_commandes   = serializers.ReadOnlyField()
    nb_livrees     = serializers.ReadOnlyField()
    affectations   = AffectationSerializer(many=True, read_only=True)

    class Meta:
        model  = Tournee
        fields = [
            'id', 'reference',
            'livreur', 'livreur_nom',
            'date_prevue', 'heure_depart',
            'zone_gouvernorat',
            'statut', 'notes',
            'nb_commandes', 'nb_livrees',
            'affectations',
            'created_at', 'updated_at',
        ]

    def get_livreur_nom(self, obj):
        return obj.livreur.nom_complet if obj.livreur else None


class TourneeListSerializer(serializers.ModelSerializer):
    livreur_nom  = serializers.SerializerMethodField()
    nb_commandes = serializers.ReadOnlyField()
    nb_livrees   = serializers.ReadOnlyField()

    class Meta:
        model  = Tournee
        fields = [
            'id', 'reference',
            'livreur', 'livreur_nom',
            'date_prevue', 'heure_depart',
            'zone_gouvernorat',
            'statut',
            'nb_commandes', 'nb_livrees',
            'created_at',
        ]

    def get_livreur_nom(self, obj):
        return obj.livreur.nom_complet if obj.livreur else None


# ─────────────────────────────────────────
# CRÉATION DE TOURNÉE AVEC SÉLECTION DE COMMANDES
# ─────────────────────────────────────────

class TourneeCreateSerializer(serializers.ModelSerializer):
    commande_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        write_only=True,
        help_text="Liste des IDs des commandes à affecter"
    )

    class Meta:
        model = Tournee
        fields = [
            'livreur', 
            'date_prevue', 
            'heure_depart',
            'zone_gouvernorat', 
            'notes',
            'commande_ids'
        ]

    def validate_livreur(self, livreur):
        if not livreur:
            raise serializers.ValidationError("Le livreur est requis")
        return livreur

    def validate_date_prevue(self, value):
        from datetime import datetime, timedelta
        if value < datetime.now().date():
            raise serializers.ValidationError("La date doit être dans le futur")
        if value > datetime.now().date() + timedelta(days=365):
            raise serializers.ValidationError("La date ne peut pas être à plus d'un an dans le futur")
        return value

    def validate_zone_gouvernorat(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le gouvernorat est requis")
        return value.strip()

    def validate_commande_ids(self, value):
        if not value:
            return value

        commandes = Commande.objects.filter(id__in=value, statut=StatutCommande.EN_ATTENTE)
        if len(commandes) != len(value):
            raise serializers.ValidationError(
                "Certaines commandes sont introuvables ou ne sont plus en attente."
            )
        return value

    def create(self, validated_data):
        commande_ids = validated_data.pop('commande_ids', [])
        entreprise = self.context.get('entreprise')

        if not entreprise:
            raise serializers.ValidationError("Entreprise non trouvée dans le contexte.")

        tournee = Tournee.objects.create(
            entreprise=entreprise,
            **validated_data
        )

        if commande_ids:
            with transaction.atomic():
                for i, cmd_id in enumerate(commande_ids, start=1):
                    commande = Commande.objects.get(id=cmd_id)

                    AffectationCommande.objects.create(
                        tournee=tournee,
                        commande=commande,
                        ordre=i,
                        notes="Affectée lors de la création de la tournée"
                    )

                    # Mise à jour statut commande
                    ancien = commande.statut
                    commande.statut = StatutCommande.PRISE_CHARGE
                    commande.save()

                    HistoriqueStatut.objects.create(
                        commande=commande,
                        ancien_statut=ancien,
                        nouveau_statut=StatutCommande.PRISE_CHARGE,
                        commentaire=f"Affectée à la tournée {tournee.reference}"
                    )

        return tournee


# Garder TourneeUpdateSerializer si tu en as besoin ailleurs
class TourneeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tournee
        fields = [
            'livreur', 'date_prevue', 'heure_depart',
            'zone_gouvernorat', 'statut', 'notes',
        ]


# ─────────────────────────────────────────
# AFFECTATION — Création (pour usage séparé)
# ─────────────────────────────────────────

class AffectationCreateSerializer(serializers.Serializer):
    commande_id = serializers.IntegerField()
    ordre       = serializers.IntegerField(default=1, min_value=1)
    notes       = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_commande_id(self, value):
        if value <= 0:
            raise serializers.ValidationError("L'ID de la commande doit être positif")
        try:
            commande = Commande.objects.get(pk=value)
            if commande.statut == StatutCommande.ANNULEE:
                raise serializers.ValidationError("Impossible d'affecter une commande annulée")
        except Commande.DoesNotExist:
            raise serializers.ValidationError("Commande introuvable")
        return value