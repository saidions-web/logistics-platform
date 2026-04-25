from rest_framework import serializers
import re
from decimal import Decimal
from .models import Commande, Colis, HistoriqueStatut, StatutCommande
from .services.geocoding import geocode_address   # ← Assure-toi que ce fichier existe


class ColisSerializer(serializers.ModelSerializer):
    class Meta:
        model = Colis
        fields = ['id', 'description', 'poids', 'fragile']

    def validate_description(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La description du colis est requise")
        if len(value) < 3:
            raise serializers.ValidationError("La description doit contenir au moins 3 caractères")
        if len(value) > 200:
            raise serializers.ValidationError("La description ne peut pas dépasser 200 caractères")
        return value.strip()

    def validate_poids(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Le poids doit être supérieur à 0")
        if value > 500:
            raise serializers.ValidationError("Le poids ne peut pas dépasser 500 kg")
        return value


class HistoriqueStatutSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistoriqueStatut
        fields = ['ancien_statut', 'nouveau_statut', 'commentaire', 'date']


class CommandeSerializer(serializers.ModelSerializer):
    colis         = ColisSerializer(many=True, read_only=True)
    historique    = HistoriqueStatutSerializer(many=True, read_only=True)
    nombre_colis  = serializers.ReadOnlyField()
    poids_total   = serializers.ReadOnlyField()
    montant_total = serializers.ReadOnlyField()
    statut_label  = serializers.CharField(source='get_statut_display', read_only=True)

    dest_latitude  = serializers.FloatField(read_only=True)
    dest_longitude = serializers.FloatField(read_only=True)

    # === AJOUT IMPORTANT POUR AFFICHER LA BOUTIQUE ===
    vendeur_nom_complet = serializers.SerializerMethodField()
    boutique            = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            'id', 'reference', 'entreprise',
            'dest_nom', 'dest_prenom', 'dest_telephone',
            'dest_adresse', 'dest_gouvernorat',
            'dest_latitude', 'dest_longitude',
            'type_livraison',
            'montant_a_collecter',
            'prix_livraison',
            'montant_total',
            'notes', 'statut', 'statut_label',
            'nombre_colis', 'poids_total',
            'colis', 'historique',
            'created_at', 'updated_at',

            # Nouveaux champs
            'vendeur_nom_complet',
            'boutique',
        ]

    def get_vendeur_nom_complet(self, obj):
        if obj.vendeur:
            return f"{obj.vendeur.first_name} {obj.vendeur.last_name}".strip()
        return None

    def get_boutique(self, obj):
        if obj.vendeur and hasattr(obj.vendeur, 'vendeur_profile'):
            p = obj.vendeur.vendeur_profile
            return {
                'nom_boutique': p.nom_boutique,
                'secteur': p.secteur,
                'gouvernorat': p.gouvernorat,
                'adresse_expedition': p.adresse_expedition,
            }
        return None


class CommandeCreateSerializer(serializers.ModelSerializer):
    colis = ColisSerializer(many=True)

    class Meta:
        model = Commande
        fields = [
            'dest_nom', 'dest_prenom', 'dest_telephone',
            'dest_adresse', 'dest_gouvernorat',
            'type_livraison', 'montant_a_collecter',
            'notes', 'colis',
        ]

    def _validate_name(self, value, field_name):
        if not value or not value.strip():
            raise serializers.ValidationError(f"Le {field_name} est requis")
        if len(value) < 2:
            raise serializers.ValidationError(f"Le {field_name} doit contenir au moins 2 caractères")
        if len(value) > 100:
            raise serializers.ValidationError(f"Le {field_name} ne peut pas dépasser 100 caractères")
        return value.strip().title()

    def validate_dest_nom(self, value):
        return self._validate_name(value, "nom")

    def validate_dest_prenom(self, value):
        return self._validate_name(value, "prénom")

    def validate_dest_telephone(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le téléphone est requis")
        tel = value.replace(' ', '').replace('-', '').replace('.', '')
        if not re.match(r'^(\+216|0|216)?[0-9]{8}$', tel):
            raise serializers.ValidationError("Le numéro doit être au format tunisien avec 8 chiffres")
        return value.strip()

    def validate_dest_adresse(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("L'adresse est requise")
        if len(value) < 10:
            raise serializers.ValidationError("L'adresse doit contenir au moins 10 caractères")
        return value.strip()

    def validate_dest_gouvernorat(self, value):
        if not value:
            raise serializers.ValidationError("Le gouvernorat est requis")
        from .models import GOUVERNORATS
        gouvernorats_list = [g[0] for g in GOUVERNORATS]
        if value not in gouvernorats_list:
            raise serializers.ValidationError(f"Le gouvernorat '{value}' n'est pas valide")
        return value

    def validate_colis(self, value):
        if not value:
            raise serializers.ValidationError("La commande doit contenir au moins un colis")
        if len(value) > 100:
            raise serializers.ValidationError("Maximum 100 colis par commande")
        return value

    def create(self, validated_data):
        colis_data = validated_data.pop('colis')
        vendeur = validated_data.pop('vendeur', None)

        # Géocodage automatique
        lat, lng = geocode_address(
            validated_data.get('dest_adresse'),
            validated_data.get('dest_gouvernorat')
        )

        commande = Commande.objects.create(
            **validated_data,
            vendeur=vendeur,
            dest_latitude=lat,
            dest_longitude=lng
        )

        # Création des colis
        for c in colis_data:
            Colis.objects.create(commande=commande, **c)

        # Recalcul du prix de livraison (après création des colis)
        commande.prix_livraison = commande.calcul_prix_livraison()
        commande.save(update_fields=['prix_livraison'])
        self.success_message = f"La commande {commande.reference} a été créée avec succès."
        return commande


class CommandeUpdateSerializer(serializers.ModelSerializer):
    colis = ColisSerializer(many=True, required=False)

    class Meta:
        model = Commande
        fields = [
            'dest_nom', 'dest_prenom', 'dest_telephone',
            'dest_adresse', 'dest_gouvernorat',
            'type_livraison', 'montant_a_collecter',
            'notes', 'colis',
        ]

    def validate(self, attrs):
        if self.instance and self.instance.statut != StatutCommande.EN_ATTENTE:
            raise serializers.ValidationError(
                "Impossible de modifier une commande déjà prise en charge."
            )
        return attrs

    def update(self, instance, validated_data):
        colis_data = validated_data.pop('colis', None)

        # Mise à jour des champs simples
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Géocodage si l'adresse change
        if 'dest_adresse' in validated_data or 'dest_gouvernorat' in validated_data:
            lat, lng = geocode_address(
                instance.dest_adresse,
                instance.dest_gouvernorat
            )
            instance.dest_latitude = lat
            instance.dest_longitude = lng

        instance.save()

        # Mise à jour des colis + recalcul prix
        if colis_data is not None:
            instance.colis.all().delete()
            for c in colis_data:
                Colis.objects.create(commande=instance, **c)

            instance.prix_livraison = instance.calcul_prix_livraison()
            instance.save(update_fields=['prix_livraison'])
        self.success_message = f"La commande {instance.reference} a été modifiée avec succès."
        return instance