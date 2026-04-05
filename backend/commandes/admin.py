from django.contrib import admin
from django.utils.html import format_html
from .models import Commande, Colis, HistoriqueStatut, StatutCommande


class ColisInline(admin.TabularInline):
    model  = Colis
    extra  = 0
    fields = ['description', 'poids', 'fragile']


class HistoriqueInline(admin.TabularInline):
    model     = HistoriqueStatut
    extra     = 0
    readonly_fields = ['ancien_statut', 'nouveau_statut', 'commentaire', 'date']
    can_delete = False


STATUT_COLORS = {
    StatutCommande.EN_ATTENTE:   ('#f59e0b', '#000'),
    StatutCommande.PRISE_CHARGE: ('#3b82f6', '#fff'),
    StatutCommande.EN_TRANSIT:   ('#8b5cf6', '#fff'),
    StatutCommande.LIVREE:       ('#10b981', '#fff'),
    StatutCommande.RETOURNEE:    ('#ef4444', '#fff'),
    StatutCommande.ANNULEE:      ('#6b7280', '#fff'),
}


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display  = ['reference', 'vendeur', 'destinataire', 'dest_gouvernorat',
                     'type_livraison', 'montant_a_collecter', 'statut_badge', 'created_at']
    list_filter   = ['statut', 'type_livraison', 'dest_gouvernorat']
    search_fields = ['reference', 'dest_nom', 'dest_prenom', 'dest_telephone', 'reference_interne']
    readonly_fields = ['reference', 'created_at']
    inlines       = [ColisInline, HistoriqueInline]

    fieldsets = (
        ('Référence', {
            'fields': ('reference', 'vendeur', 'statut', 'reference_interne')
        }),
        ('Destinataire', {
            'fields': ('dest_nom', 'dest_prenom', 'dest_telephone', 'dest_adresse', 'dest_gouvernorat')
        }),
        ('Livraison', {
            'fields': ('type_livraison', 'montant_a_collecter', 'notes')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def destinataire(self, obj):
        return f"{obj.dest_nom} {obj.dest_prenom} — {obj.dest_telephone}"
    destinataire.short_description = "Destinataire"

    def statut_badge(self, obj):
        bg, fg = STATUT_COLORS.get(obj.statut, ('#eee', '#000'))
        return format_html(
            '<span style="background:{};color:{};padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">{}</span>',
            bg, fg, obj.get_statut_display()
        )
    statut_badge.short_description = "Statut"


@admin.register(Colis)
class ColisAdmin(admin.ModelAdmin):
    list_display  = ['commande', 'description', 'poids', 'fragile']
    list_filter   = ['fragile']
    search_fields = ['commande__reference', 'description']