from rest_framework import serializers
from .models import Tarif
from commandes.models import GOUVERNORATS


class TarifSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Tarif
        fields = [
            'id', 'gouvernorat',
            'poids_min', 'poids_max',
            'prix', 'delai_jours',
        ]

    def validate_gouvernorat(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                'Le gouvernorat est requis.'
            )
        valid = [g[0] for g in GOUVERNORATS]
        if value not in valid:
            raise serializers.ValidationError(
                f'Le gouvernorat "{value}" n\'est pas valide.'
            )
        return value.strip()

    def validate_poids_min(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError(
                'Le poids minimum doit être supérieur à 0.'
            )
        if value > 1000:
            raise serializers.ValidationError(
                'Le poids minimum semble trop élevé.'
            )
        return value

    def validate_poids_max(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError(
                'Le poids maximum doit être supérieur à 0.'
            )
        if value > 500:
            raise serializers.ValidationError(
                'Le poids maximum semble trop élevé.'
            )
        return value

    def validate_prix(self, value):
        if value is None or value < 0:
            raise serializers.ValidationError(
                'Le prix ne peut pas être négatif.'
            )
        return value

    def validate(self, data):
        poids_min = data.get('poids_min')
        poids_max = data.get('poids_max')

        if (
            poids_min is not None
            and poids_max is not None
            and poids_min > poids_max
        ):
            raise serializers.ValidationError(
                'Le poids minimum ne peut pas être '
                'supérieur au poids maximum.'
            )

        # ✅ CORRECTION : vérification de chevauchement
        entreprise = self.context.get('entreprise')
        gouvernorat = data.get('gouvernorat')

        if entreprise and gouvernorat and poids_min and poids_max:
            chevauchement = Tarif.objects.filter(
                entreprise=entreprise,
                gouvernorat=gouvernorat,
                poids_min__lt=poids_max,
                poids_max__gt=poids_min,
            )
            if self.instance:
                chevauchement = chevauchement.exclude(
                    pk=self.instance.pk
                )
            if chevauchement.exists():
                raise serializers.ValidationError(
                    'Un tarif existant chevauche cette '
                    'plage de poids pour ce gouvernorat.'
                )

        return data