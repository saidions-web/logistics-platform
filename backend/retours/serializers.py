from rest_framework import serializers
from .models import RetourCommande, MotifRetour, StatutRetour


class RetourCommandeSerializer(serializers.ModelSerializer):
    motif_label    = serializers.CharField(source='get_motif_display',  read_only=True)
    statut_label   = serializers.CharField(source='get_statut_display', read_only=True)

    # Infos commande dénormalisées pour le frontend
    commande_reference    = serializers.CharField(source='commande.reference',        read_only=True)
    commande_dest_nom     = serializers.CharField(source='commande.dest_nom',         read_only=True)
    commande_dest_prenom  = serializers.CharField(source='commande.dest_prenom',      read_only=True)
    commande_gouvernorat  = serializers.CharField(source='commande.dest_gouvernorat', read_only=True)
    commande_montant      = serializers.DecimalField(
        source='commande.montant_a_collecter',
        max_digits=10, decimal_places=3, read_only=True
    )
    vendeur_id = serializers.IntegerField(source='commande.vendeur.id', read_only=True)

    class Meta:
        model  = RetourCommande
        fields = [
            'id', 'commande', 'commande_reference',
            'commande_dest_nom', 'commande_dest_prenom',
            'commande_gouvernorat', 'commande_montant',
            'vendeur_id',
            'motif', 'motif_label',
            'commentaire',
            'statut', 'statut_label',
            'decision_vendeur', 'notes_vendeur',
            'date_retour', 'date_decision', 'updated_at',
        ]
        read_only_fields = ['id', 'commande', 'date_retour', 'date_decision', 'updated_at']


class DecisionVendeurSerializer(serializers.Serializer):
    """Corps de la requête PATCH /retours/<id>/decision/"""
    decision     = serializers.ChoiceField(choices=['reprogrammer', 'annuler'])
    notes_vendeur = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_decision(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("La décision est requise")
        if value.lower() not in ['reprogrammer', 'annuler']:
            raise serializers.ValidationError("La décision doit être 'reprogrammer' ou 'annuler'")
        return value.lower().strip()

    def validate_notes_vendeur(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Les notes ne peuvent pas dépasser 500 caractères")
        return value or ""


class RetourCreateSerializer(serializers.Serializer):
    """Corps de la requête POST depuis l'entreprise pour déclarer un retour."""
    commande_id = serializers.IntegerField()
    motif       = serializers.ChoiceField(choices=MotifRetour.choices)
    commentaire = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_commande_id(self, value):
        from commandes.models import Commande
        if value <= 0:
            raise serializers.ValidationError("L'ID de la commande doit être positif")
        if not Commande.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Commande introuvable")
        # Vérifier si un retour existe déjà pour cette commande
        if RetourCommande.objects.filter(commande_id=value).exists():
            raise serializers.ValidationError("Un retour existe déjà pour cette commande")
        return value

    def validate_motif(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le motif est requis")
        return value.strip()

    def validate_commentaire(self, value):
        if value and len(value) > 500:
            raise serializers.ValidationError("Le commentaire ne peut pas dépasser 500 caractères")
        return value or ""