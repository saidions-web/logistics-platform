from rest_framework import serializers
import re
from .models import Livreur
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
        if not re.match(r'^(\+216|0|216)?[0-9]{8}$', tel):
            raise serializers.ValidationError("Le téléphone doit être au format tunisien avec 8 chiffres (ex: 0X XXX XXX)")
        return value.strip()

    def validate_cin(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La CIN est requise")
        cin = value.strip().upper()
        if len(cin) != 8:
            raise serializers.ValidationError("La CIN doit contenir exactement 8 caractères")
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
# DASHBOARD KPI
# ─────────────────────────────────────────

class DashboardEntrepriseSerializer(serializers.Serializer):
    kpi = serializers.DictField()
    commandes_recentes = CommandeSerializer(many=True)