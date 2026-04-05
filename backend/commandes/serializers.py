from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
import re
from .models import Commande, Colis, HistoriqueStatut, StatutCommande


class ColisSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Colis
        fields = ['id', 'description', 'poids', 'fragile']

    def validate_description(self, value):
        """Valider la description du colis"""
        if not value or not value.strip():
            raise serializers.ValidationError("La description du colis est requise")
        if len(value) < 3:
            raise serializers.ValidationError("La description doit contenir au moins 3 caractères")
        if len(value) > 200:
            raise serializers.ValidationError("La description ne peut pas dépasser 200 caractères")
        return value.strip()

    def validate_poids(self, value):
        """Valider le poids du colis"""
        if value is None or value == 0:
            raise serializers.ValidationError("Le poids doit être supérieur à 0")
        if value <= 0:
            raise serializers.ValidationError("Le poids doit être positif")
        if value > 500:
            raise serializers.ValidationError("Le poids ne peut pas dépasser 500 kg")
        return value


class HistoriqueStatutSerializer(serializers.ModelSerializer):
    class Meta:
        model  = HistoriqueStatut
        fields = ['ancien_statut', 'nouveau_statut', 'commentaire', 'date']


class CommandeSerializer(serializers.ModelSerializer):
    colis         = ColisSerializer(many=True, read_only=True)
    historique    = HistoriqueStatutSerializer(many=True, read_only=True)
    nombre_colis  = serializers.ReadOnlyField()
    poids_total   = serializers.ReadOnlyField()
    montant_total = serializers.ReadOnlyField()
    statut_label  = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model  = Commande
        fields = [
            'id', 'reference',
            'dest_nom', 'dest_prenom', 'dest_telephone',
            'dest_adresse', 'dest_gouvernorat',
            'type_livraison',
            'montant_a_collecter',
            'prix_livraison',
            'montant_total',
            'notes', 'statut', 'statut_label',
            'nombre_colis', 'poids_total',
            'colis', 'historique',
            'created_at', 'updated_at',
        ]
    
    def to_representation(self, instance):
        """Recalculer et retourner le prix de livraison correct basé sur les tarifs"""
        data = super().to_representation(instance)
        
        try:
            # Étape 1: Récupérer l'entreprise assignée (traiter 0 comme NULL)
            entreprise = instance.entreprise
            if not entreprise or (hasattr(entreprise, 'pk') and entreprise.pk == 0):
                entreprise = None
            
            # Étape 2: Si pas d'entreprise directe, chercher via Recommandation
            if not entreprise:
                try:
                    from recommandation.models import Recommandation
                    reco = Recommandation.objects.filter(commande=instance).first()
                    if reco and reco.entreprise_choisie:
                        # Vérifier que entreprise_choisie n'est pas 0
                        if reco.entreprise_choisie.pk and reco.entreprise_choisie.pk != 0:
                            entreprise = reco.entreprise_choisie
                except Exception:
                    pass
            
            # Étape 3: Si on a une entreprise valide, calculer le prix correct
            if entreprise and entreprise.pk and entreprise.pk != 0:
                from tarif.models import Tarif
                from decimal import Decimal as D
                
                # Récupérer le poids total de manière sûre
                try:
                    poids = instance.poids_total
                    if not poids:
                        poids = D('0')
                    else:
                        poids = D(str(poids))
                except:
                    poids = D('0')
                
                # Chercher le tarif correspondant
                tarifs = Tarif.objects.filter(
                    entreprise=entreprise,
                    gouvernorat=instance.dest_gouvernorat
                ).all()
                
                tarif_trouve = None
                for tarif in tarifs:
                    try:
                        # Convertir en Decimal de manière sûre
                        pmin = D(str(tarif.poids_min)) if tarif.poids_min else D('0')
                        pmax = D(str(tarif.poids_max)) if tarif.poids_max else D('999')
                        
                        if pmin <= poids <= pmax:
                            tarif_trouve = tarif
                            break
                    except Exception:
                        continue
                
                # Calculer le prix
                if tarif_trouve:
                    prix = D(str(tarif_trouve.prix))
                else:
                    # Fallback: utiliser 10 TND si aucun tarif ne correspond
                    prix = D('10')
                
                # Ajouter les suppléments
                if instance.type_livraison == 'express':
                    prix += D('5')
                
                if instance.colis.filter(fragile=True).exists():
                    prix += D('2')
                
                data['prix_livraison'] = float(prix)
            
        except Exception as e:
            # En cas d'erreur grave, garder la valeur existante
            pass
        
        return data


class CommandeCreateSerializer(serializers.ModelSerializer):
    colis = ColisSerializer(many=True)

    class Meta:
        model  = Commande
        fields = [
            'dest_nom', 'dest_prenom', 'dest_telephone',
            'dest_adresse', 'dest_gouvernorat',
            'type_livraison', 'montant_a_collecter',
            'notes', 'colis',
        ]

    def _validate_name(self, value, field_name):
        """Valider un prénom ou nom"""
        if not value or not value.strip():
            raise serializers.ValidationError(f"Le {field_name} est requis")
        if len(value) < 2:
            raise serializers.ValidationError(f"Le {field_name} doit contenir au moins 2 caractères")
        if len(value) > 100:
            raise serializers.ValidationError(f"Le {field_name} ne peut pas dépasser 100 caractères")
        # Vérifier utilisateur pas trop de nombres
        if sum(1 for c in value if c.isdigit()) > 3:
            raise serializers.ValidationError(f"Le {field_name} contient trop de chiffres")
        return value.strip().title()

    def validate_dest_nom(self, value):
        return self._validate_name(value, "nom")

    def validate_dest_prenom(self, value):
        return self._validate_name(value, "prénom")

    def validate_dest_telephone(self, value):
        """Valider le numéro de téléphone tunisien"""
        if not value or not value.strip():
            raise serializers.ValidationError("Le téléphone est requis")
        # Nettoyer le numéro
        tel = value.replace(' ', '').replace('-', '').replace('.', '')
        # Vérifier format tunisien avec 8 chiffres
        if not re.match(r'^(\+216|0|216)?[0-9]{8}$', tel):
            raise serializers.ValidationError(
                "Le numéro doit être au format tunisien avec 8 chiffres (ex: 0X XXX XXX ou +216 XX XXX XXX)"
            )
        return value.strip()

    def validate_dest_adresse(self, value):
        """Valider l'adresse de livraison"""
        if not value or not value.strip():
            raise serializers.ValidationError("L'adresse est requise")
        if len(value) < 10:
            raise serializers.ValidationError("L'adresse doit contenir au moins 10 caractères")
        if len(value) > 255:
            raise serializers.ValidationError("L'adresse ne peut pas dépasser 255 caractères")
        return value.strip()

    def validate_dest_gouvernorat(self, value):
        """Valider le gouvernorat"""
        if not value:
            raise serializers.ValidationError("Le gouvernorat est requis")
        from .models import GOUVERNORATS
        gouvernorats_list = [g[0] for g in GOUVERNORATS]
        if value not in gouvernorats_list:
            raise serializers.ValidationError(f"Le gouvernorat '{value}' n'est pas valide")
        return value

    def validate_montant_a_collecter(self, value):
        """Valider le montant à collecter"""
        if value is None:
            raise serializers.ValidationError("Le montant est requis")
        if value < 0:
            raise serializers.ValidationError("Le montant ne peut pas être négatif")
        if value == 0:
            raise serializers.ValidationError("Le montant doit être supérieur à 0")
        if value > 999999:
            raise serializers.ValidationError("Le montant ne peut pas dépasser 999999 TND")
        return value

    def validate_colis(self, value):
        """Valider la liste des colis"""
        if not value:
            raise serializers.ValidationError("La commande doit contenir au moins un colis")
        if len(value) > 100:
            raise serializers.ValidationError("La commande ne peut pas contenir plus de 100 colis")
        return value

    def validate_notes(self, value):
        """Valider les notes"""
        if value and len(value) > 500:
            raise serializers.ValidationError("Les notes ne peuvent pas dépasser 500 caractères")
        return value or ""

    def create(self, validated_data):
        colis_data = validated_data.pop('colis')
        commande   = Commande.objects.create(**validated_data)

        for c in colis_data:
            Colis.objects.create(commande=commande, **c)

        # Recalcul prix APRÈS sauvegarde des colis
        commande.prix_livraison = commande.calcul_prix_livraison()
        commande.save(update_fields=['prix_livraison'])

        return commande


class CommandeUpdateSerializer(serializers.ModelSerializer):
    colis = ColisSerializer(many=True, required=False)

    class Meta:
        model  = Commande
        fields = [
            'dest_nom', 'dest_prenom', 'dest_telephone',
            'dest_adresse', 'dest_gouvernorat',
            'type_livraison', 'montant_a_collecter',
            'notes', 'colis',
        ]

    def _validate_name(self, value, field_name):
        """Valider un prénom ou nom"""
        if value is not None:
            if not value or not value.strip():
                raise serializers.ValidationError(f"Le {field_name} est requis")
            if len(value) < 2:
                raise serializers.ValidationError(f"Le {field_name} doit contenir au moins 2 caractères")
            if len(value) > 100:
                raise serializers.ValidationError(f"Le {field_name} ne peut pas dépasser 100 caractères")
            if sum(1 for c in value if c.isdigit()) > 3:
                raise serializers.ValidationError(f"Le {field_name} contient trop de chiffres")
            return value.strip().title()
        return value

    def validate_dest_nom(self, value):
        return self._validate_name(value, "nom")

    def validate_dest_prenom(self, value):
        return self._validate_name(value, "prénom")

    def validate_dest_telephone(self, value):
        """Valider le numéro de téléphone tunisien"""
        if value is not None:
            if not value or not value.strip():
                raise serializers.ValidationError("Le téléphone est requis")
            tel = value.replace(' ', '').replace('-', '').replace('.', '')
            if not re.match(r'^(\+216|0|216)?[0-9]{8}$', tel):
                raise serializers.ValidationError(
                    "Le numéro doit être au format tunisien avec 8 chiffres (ex: 0X XXX XXX ou +216 XX XXX XXX)"
                )
            return value.strip()
        return value

    def validate_dest_adresse(self, value):
        """Valider l'adresse de livraison"""
        if value is not None:
            if not value or not value.strip():
                raise serializers.ValidationError("L'adresse est requise")
            if len(value) < 10:
                raise serializers.ValidationError("L'adresse doit contenir au moins 10 caractères")
            if len(value) > 255:
                raise serializers.ValidationError("L'adresse ne peut pas dépasser 255 caractères")
            return value.strip()
        return value

    def validate_dest_gouvernorat(self, value):
        """Valider le gouvernorat"""
        if value is not None:
            from .models import GOUVERNORATS
            gouvernorats_list = [g[0] for g in GOUVERNORATS]
            if value not in gouvernorats_list:
                raise serializers.ValidationError(f"Le gouvernorat '{value}' n'est pas valide")
        return value

    def validate_montant_a_collecter(self, value):
        """Valider le montant à collecter"""
        if value is not None:
            if value < 0:
                raise serializers.ValidationError("Le montant ne peut pas être négatif")
            if value == 0:
                raise serializers.ValidationError("Le montant doit être supérieur à 0")
            if value > 999999:
                raise serializers.ValidationError("Le montant ne peut pas dépasser 999999 TND")
        return value

    def validate_notes(self, value):
        """Valider les notes"""
        if value and len(value) > 500:
            raise serializers.ValidationError("Les notes ne peuvent pas dépasser 500 caractères")
        return value or ""

    def validate(self, attrs):
        if self.instance.statut != StatutCommande.EN_ATTENTE:
            raise serializers.ValidationError(
                "Impossible de modifier une commande déjà prise en charge."
            )
        return attrs

    def update(self, instance, validated_data):
        colis_data = validated_data.pop('colis', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if colis_data is not None:
            instance.colis.all().delete()
            for c in colis_data:
                Colis.objects.create(commande=instance, **c)
            # Recalcul après màj des colis
            instance.prix_livraison = instance.calcul_prix_livraison()
            instance.save(update_fields=['prix_livraison'])

        return instance