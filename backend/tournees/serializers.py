from rest_framework import serializers
from .models import Tournee, AffectationCommande
from commandes.models import Commande, StatutCommande
from commandes.serializers import CommandeSerializer


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
            'commande_montant','commande_dest_adresse',      
            'affectee_le','commande_dest_telephone',
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


class TourneeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tournee
        fields = [
            'livreur', 'date_prevue', 'heure_depart',
            'zone_gouvernorat', 'notes',
        ]

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

    def validate_notes(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Les notes ne peuvent pas dépasser 500 caractères")
        return value or ""

    def validate_livreur(self, livreur):
        if not livreur:
            raise serializers.ValidationError("Le livreur est requis")
        return livreur


class TourneeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tournee
        fields = [
            'livreur', 'date_prevue', 'heure_depart',
            'zone_gouvernorat', 'statut', 'notes',
        ]


# ─────────────────────────────────────────
# AFFECTATION — Création
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

    def validate_ordre(self, value):
        if value <= 0:
            raise serializers.ValidationError("L'ordre doit être supérieur à 0")
        if value > 1000:
            raise serializers.ValidationError("L'ordre semble élevé pour une tournée")
        return value

    def validate_notes(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Les notes ne peuvent pas dépasser 500 caractères")
        return value or ""