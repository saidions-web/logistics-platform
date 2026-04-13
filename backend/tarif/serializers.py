from rest_framework import serializers
from .models import Tarif


class TarifSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tarif
        # On liste explicitement les champs pour éviter les problèmes avec '__all__'
        fields = ['gouvernorat', 'poids_min', 'poids_max', 'prix', 'delai_jours']
        # On ne met plus 'entreprise' ici car il est géré dans la view

    def validate_gouvernorat(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Le gouvernorat est requis.")
        # Vérifier qu'il fait partie des choix valides
        from commandes.models import GOUVERNORATS
        valid_gouvernorats = [g[0] for g in GOUVERNORATS]
        if value not in valid_gouvernorats:
            raise serializers.ValidationError(f"Le gouvernorat '{value}' n'est pas valide.")
        return value.strip()

    def validate_poids_min(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Le poids minimum doit être supérieur à 0.")
        if value > 1000:
            raise serializers.ValidationError("Le poids minimum semble trop élevé.")
        return value

    def validate_poids_max(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Le poids maximum doit être supérieur à 0.")
        if value > 500:
            raise serializers.ValidationError("Le poids maximum semble trop élevé.")
        return value

    def validate_prix(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("Le prix ne peut pas être négatif.")
        if value > 999999:
            raise serializers.ValidationError("Le prix semble trop élevé.")
        return value

    def validate(self, data):
        poids_min = data.get('poids_min')
        poids_max = data.get('poids_max')
        if poids_min is not None and poids_max is not None and poids_min > poids_max:
            raise serializers.ValidationError("Le poids minimum ne peut pas être supérieur au poids maximum.")
        return data