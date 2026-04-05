from rest_framework import serializers
from .models import Tarif
 
 
class TarifSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tarif
        fields = '__all__'
        read_only_fields = ['entreprise']

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
        if value > 500000:
            raise serializers.ValidationError("Le poids maximum semble errponé")
        return value

    def validate_prix(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError("Le prix ne peut pas être négatif")
        if value > 999999:
            raise serializers.ValidationError("Le prix semble élevé")
        return value

    def validate(self, data):
        poids_min = data.get('poids_min')
        poids_max = data.get('poids_max')
        if poids_min and poids_max and poids_min > poids_max:
            raise serializers.ValidationError("Le poids min ne peut pas être supérieur au poids max")
        return data