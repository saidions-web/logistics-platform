from django.contrib.auth.base_user import BaseUserManager


class CustomUserManager(BaseUserManager):
    """
    Manager personnalisé pour CustomUser.
    Utilise email au lieu de username.
    """

    def create_user(self, email, password=None, **extra_fields):
        # 1. Vérifier que l'email est fourni
        if not email:
            raise ValueError("L'adresse email est obligatoire.")

        # 2. Normaliser l'email → "ALI@GMAIL.COM" devient "ALI@gmail.com"
        email = self.normalize_email(email)

        # 3. Créer l'objet user sans le sauvegarder encore
        user = self.model(email=email, **extra_fields)

        # 4. Hasher le mot de passe → "1234" devient "$2b$12$Kd8..."
        user.set_password(password)

        # 5. Sauvegarder en base
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        # Un superuser = staff + superuser + tout activé
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_email_verified', True)
        extra_fields.setdefault('is_approved', True)
        return self.create_user(email, password, **extra_fields)