from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, VendeurProfile, EntrepriseProfile, EmailVerificationToken


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display  = ('email', 'get_full_name', 'role', 'is_email_verified', 'is_approved', 'date_joined')
    list_filter   = ('role', 'is_email_verified', 'is_approved')
    search_fields = ('email', 'first_name', 'last_name')
    ordering      = ('-date_joined',)

    # Remplacer username par email dans les formulaires
    fieldsets = (
        (None,          {'fields': ('email', 'password')}),
        ('Informations',{'fields': ('first_name', 'last_name', 'phone', 'role')}),
        ('Statuts',     {'fields': ('is_active', 'is_staff', 'is_email_verified', 'is_approved')}),
        ('Permissions', {'fields': ('is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'role', 'password1', 'password2'),
        }),
    )


@admin.register(VendeurProfile)
class VendeurProfileAdmin(admin.ModelAdmin):
    list_display  = ('nom_boutique', 'user', 'secteur', 'gouvernorat')
    search_fields = ('nom_boutique', 'user__email')
    list_filter   = ('secteur', 'gouvernorat')


@admin.register(EntrepriseProfile)
class EntrepriseProfileAdmin(admin.ModelAdmin):
    list_display  = ('raison_sociale', 'user', 'forme_juridique', 'gouvernorat')
    search_fields = ('raison_sociale', 'user__email')
    list_filter   = ('forme_juridique', 'gouvernorat')


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display    = ('user', 'token', 'is_used', 'created_at', 'expires_at')
    list_filter     = ('is_used',)
    readonly_fields = ('token', 'created_at', 'expires_at')