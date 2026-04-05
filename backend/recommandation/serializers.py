from rest_framework import serializers
from tarif.models import Tarif
from .models import Recommandation
from accounts.models import EntrepriseProfile


# ─────────────────────────────────────────
# TARIF
# ─────────────────────────────────────────

class TarifSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tarif
        fields = ['id', 'gouvernorat', 'poids_min', 'poids_max', 'prix', 'delai_jours']


class TarifCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tarif
        fields = ['gouvernorat', 'poids_min', 'poids_max', 'prix', 'delai_jours']

    def validate_gouvernorat(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le gouvernorat est requis")
        return value.strip()

    def validate_poids_min(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Le poids minimum doit être supérieur à 0")
        if value > 1000:
            raise serializers.ValidationError("Le poids minimum semble élevé")
        return value

    def validate_poids_max(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Le poids maximum doit être supérieur à 0")
        return value

    def validate_prix(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Le prix doit être positif")
        if value > 999999:
            raise serializers.ValidationError("Le prix semble élevé")
        return value

    def validate_delai_jours(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("Le délai ne peut pas être négatif")
        if value > 365:
            raise serializers.ValidationError("Le délai semble élevé (max 365 jours)")
        return value

    def validate(self, attrs):
        poids_min = attrs.get('poids_min')
        poids_max = attrs.get('poids_max')
        if poids_min and poids_max and poids_min >= poids_max:
            raise serializers.ValidationError("poids_min doit être inférieur à poids_max")
        return attrs


# ─────────────────────────────────────────
# SCORE
# ─────────────────────────────────────────

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


# ─────────────────────────────────────────
# RECOMMANDATION (🔥 FIX ICI)
# ─────────────────────────────────────────

class RecommandationSerializer(serializers.ModelSerializer):
    # ✅ ON ENVOIE LES IDs (CRITIQUE)
    entreprise_recommandee = serializers.IntegerField(source='entreprise_recommandee.id', read_only=True)
    entreprise_choisie     = serializers.IntegerField(source='entreprise_choisie.id', read_only=True)

    # ✅ NOMS POUR UI
    entreprise_recommandee_nom = serializers.CharField(
        source='entreprise_recommandee.raison_sociale', read_only=True
    )
    entreprise_choisie_nom = serializers.CharField(
        source='entreprise_choisie.raison_sociale', read_only=True
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


# ─────────────────────────────────────────
# SELECTION MANUELLE
# ─────────────────────────────────────────

class SelectionManuelleSerializer(serializers.Serializer):
    entreprise_id = serializers.IntegerField()

    def validate_entreprise_id(self, value):
        if not EntrepriseProfile.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Entreprise introuvable.")
        return value