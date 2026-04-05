from rest_framework import serializers
import re
from .models import Livreur, Tournee, AffectationCommande, StatutLivreur
from commandes.models import Commande, StatutCommande
from commandes.serializers import CommandeSerializer


# ─────────────────────────────────────────
# LIVREUR
# ─────────────────────────────────────────

class LivreurSerializer(serializers.ModelSerializer):
    nom_complet        = serializers.ReadOnlyField()
    nb_tournees_actives = serializers.ReadOnlyField()

    class Meta:
        model  = Livreur
        fields = [
            'id', 'nom', 'prenom', 'nom_complet',
            'telephone', 'cin',
            'gouvernorats_couverts',
            'type_vehicule', 'immatriculation',
            'statut', 'nb_tournees_actives',
            'created_at',
        ]


class LivreurCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Livreur
        fields = [
            'nom', 'prenom', 'telephone', 'cin',
            'gouvernorats_couverts',
            'type_vehicule', 'immatriculation',
        ]

    def validate_nom(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le nom est requis")
        if len(value) < 2:
            raise serializers.ValidationError("Le nom doit contenir au moins 2 caractères")
        if len(value) > 100:
            raise serializers.ValidationError("Le nom ne peut pas dépasser 100 caractères")
        return value.strip().title()

    def validate_prenom(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le prénom est requis")
        if len(value) < 2:
            raise serializers.ValidationError("Le prénom doit contenir au moins 2 caractères")
        if len(value) > 100:
            raise serializers.ValidationError("Le prénom ne peut pas dépasser 100 caractères")
        return value.strip().title()

    def validate_telephone(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le téléphone est obligatoire")
        tel = value.replace(' ', '').replace('-', '').replace('.', '')
        # Téléphone tunisien : format +216 XX XXX XXX ou 0X XXX XXX (8 chiffres après le préfixe)
        if not re.match(r'^(\+216|0|216)?[0-9]{8}$', tel):
            raise serializers.ValidationError("Le téléphone doit être au format tunisien avec 8 chiffres (ex: 0X XXX XXX)")
        return value.strip()

    def validate_cin(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La CIN est requise")
        cin = value.strip().upper()
        if len(cin) != 8:
            raise serializers.ValidationError("La CIN doit contenir exactement 8 caractères")
        # CIN tunisienne: généralement 8 chiffres
        if not re.match(r'^[0-9]{8}$', cin):
            raise serializers.ValidationError("La CIN doit contenir 8 chiffres")
        return cin

    def validate_type_vehicule(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le type de véhicule est requis")
        return value.strip()

    def validate_immatriculation(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("L'immatriculation est requise")
        # Accord basic pour immatriculation tunisienne
        if not re.match(r'^[0-9]{3,4}\s?[A-Z]{2,3}\s?[0-9]+$', value.upper()):
            raise serializers.ValidationError("L'immatriculation semble invalide (format: XXX AA 123)")
        return value.strip().upper()


class LivreurUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Livreur
        fields = [
            'nom', 'prenom', 'telephone', 'cin',
            'gouvernorats_couverts',
            'type_vehicule', 'immatriculation',
            'statut',
        ]


# ─────────────────────────────────────────
# AFFECTATION (lecture)
# ─────────────────────────────────────────

class AffectationSerializer(serializers.ModelSerializer):
    commande_reference   = serializers.CharField(source='commande.reference',       read_only=True)
    commande_dest_nom    = serializers.CharField(source='commande.dest_nom',         read_only=True)
    commande_dest_prenom = serializers.CharField(source='commande.dest_prenom',      read_only=True)
    commande_gouvernorat = serializers.CharField(source='commande.dest_gouvernorat', read_only=True)
    commande_statut      = serializers.CharField(source='commande.statut',           read_only=True)
    commande_montant     = serializers.DecimalField(
        source='commande.montant_a_collecter',
        max_digits=10, decimal_places=3, read_only=True
    )

    class Meta:
        model  = AffectationCommande
        fields = [
            'id', 'ordre', 'notes',
            'commande', 'commande_reference',
            'commande_dest_nom', 'commande_dest_prenom',
            'commande_gouvernorat', 'commande_statut',
            'commande_montant',
            'affectee_le',
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
        if obj.livreur:
            return obj.livreur.nom_complet
        return None


class TourneeListSerializer(serializers.ModelSerializer):
    """Version légère pour la liste (sans affectations détaillées)."""
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
        if obj.livreur:
            return obj.livreur.nom_complet
        return None


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
        # Vérifier que le livreur appartient bien à l'entreprise (géré dans la vue)
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


# ─────────────────────────────────────────
# DASHBOARD KPI
# ─────────────────────────────────────────

class DashboardEntrepriseSerializer(serializers.Serializer):
    kpi = serializers.DictField()
    commandes_recentes = CommandeSerializer(many=True)
