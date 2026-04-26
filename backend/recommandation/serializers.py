from rest_framework import serializers
from .models import Recommandation
from accounts.models import EntrepriseProfile


class ScoreEntrepriseSerializer(serializers.Serializer):
    entreprise_id = serializers.IntegerField()
    nom           = serializers.CharField()
    score_total   = serializers.FloatField()
    score_cout    = serializers.FloatField()
    score_delai   = serializers.FloatField()
    score_taux    = serializers.FloatField()
    score_zone    = serializers.FloatField()
    prix          = serializers.FloatField()
    delai_jours   = serializers.IntegerField()
    taux_reussite = serializers.FloatField()


class RecommandationSerializer(serializers.ModelSerializer):
    entreprise_recommandee = serializers.IntegerField(
        source='entreprise_recommandee.id',
        read_only=True,
    )
    entreprise_choisie = serializers.IntegerField(
        source='entreprise_choisie.id',
        read_only=True,
    )
    entreprise_recommandee_nom = serializers.CharField(
        source='entreprise_recommandee.raison_sociale',
        read_only=True,
    )
    entreprise_choisie_nom = serializers.CharField(
        source='entreprise_choisie.raison_sociale',
        read_only=True,
    )
    scores_details = ScoreEntrepriseSerializer(many=True, read_only=True)

    class Meta:
        model  = Recommandation
        fields = [
            'id',
            'commande',
            'entreprise_recommandee',
            'entreprise_recommandee_nom',
            'entreprise_choisie',
            'entreprise_choisie_nom',
            'scores_details',
            'selection_manuelle',
            'created_at',
            'updated_at',
        ]


class SelectionManuelleSerializer(serializers.Serializer):
    entreprise_id = serializers.IntegerField()

    def validate_entreprise_id(self, value):
        if not EntrepriseProfile.objects.filter(pk=value).exists():
            raise serializers.ValidationError('Entreprise introuvable.')
        return value