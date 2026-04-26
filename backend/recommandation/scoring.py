from accounts.models import EntrepriseProfile
from commandes.models import Commande, StatutCommande
from tarif.models import Tarif
from .models import Recommandation
from notifications.models import Notification


POIDS = {
    'cout':  0.35,
    'taux':  0.30,
    'delai': 0.20,
    'zone':  0.15,
}


def normaliser(val, min_val, max_val, inverse=False):
    if max_val == min_val:
        return 1.0
    score = (val - min_val) / (max_val - min_val)
    return 1 - score if inverse else score


def get_stats(entreprise, gouvernorat=None):
    """
    Calcule le taux de réussite et le délai moyen.
    ✅ CORRECTION : filtre par gouvernorat si fourni
    pour un scoring plus pertinent géographiquement.
    """
    commandes = Commande.objects.filter(
        recommandation__entreprise_choisie=entreprise
    )

    # ✅ Filtrer par gouvernorat pour un taux localisé
    if gouvernorat:
        commandes = commandes.filter(dest_gouvernorat=gouvernorat)

    total = commandes.count()

    if total == 0:
        # Pas d'historique dans ce gouvernorat →
        # on retombe sur le taux global
        if gouvernorat:
            return get_stats(entreprise, gouvernorat=None)
        return {'taux': 0.0, 'delai': 3}

    livrees = commandes.filter(statut=StatutCommande.LIVREE).count()
    taux = livrees / total

    delais = []
    for c in commandes.filter(statut=StatutCommande.LIVREE):
        if c.updated_at and c.created_at:
            delais.append((c.updated_at - c.created_at).days)

    delai_moyen = sum(delais) / len(delais) if delais else 3

    return {'taux': taux, 'delai': delai_moyen}


def get_eligibles(commande):
    """
    Retourne les entreprises éligibles pour une commande donnée.
    ✅ CORRECTION : comparaison de liste correcte (plus de str())
    """
    gouvernorat = (commande.dest_gouvernorat or '').strip()
    poids = float(commande.poids_total or 0)

    entreprises = EntrepriseProfile.objects.filter(
        user__is_active=True,
        user__is_approved=True,
    )

    eligibles = []

    for e in entreprises:
        zones = e.zones_couverture or []

        # ✅ CORRECTION : comparaison de liste directe
        # plus de str(zones).lower() qui était fragile
        if isinstance(zones, list):
            if gouvernorat not in zones:
                continue
        elif isinstance(zones, str):
            # Sécurité si le champ JSON est mal stocké
            if gouvernorat.lower() not in zones.lower():
                continue
        else:
            continue

        tarif = Tarif.objects.filter(
            entreprise=e,
            gouvernorat=gouvernorat,
            poids_min__lte=poids,
            poids_max__gte=poids,
        ).first()

        if tarif:
            eligibles.append((e, tarif))

    return eligibles


def calculer_scores(commande):
    eligibles = get_eligibles(commande)

    if not eligibles:
        return []

    gouvernorat = commande.dest_gouvernorat
    data = []

    for e, tarif in eligibles:
        # ✅ CORRECTION : stats par gouvernorat
        stats = get_stats(e, gouvernorat=gouvernorat)
        data.append({
            'entreprise':  e,
            'id':          e.id,
            'nom':         e.raison_sociale,
            'prix':        float(tarif.prix),
            'delai':       stats['delai'],
            'taux':        stats['taux'],
            'delai_tarif': tarif.delai_jours,
        })

    prix_vals  = [d['prix']  for d in data]
    delai_vals = [d['delai'] for d in data]
    taux_vals  = [d['taux']  for d in data]

    min_prix,  max_prix  = min(prix_vals),  max(prix_vals)
    min_delai, max_delai = min(delai_vals), max(delai_vals)
    min_taux,  max_taux  = min(taux_vals),  max(taux_vals)

    results = []

    for d in data:
        sc_cout  = normaliser(d['prix'],  min_prix,  max_prix,  inverse=True)
        sc_delai = normaliser(d['delai'], min_delai, max_delai, inverse=True)
        sc_taux  = normaliser(d['taux'],  min_taux,  max_taux)
        sc_zone  = 1.0

        total = (
            POIDS['cout']  * sc_cout  +
            POIDS['taux']  * sc_taux  +
            POIDS['delai'] * sc_delai +
            POIDS['zone']  * sc_zone
        )

        results.append({
            'entreprise':    d['entreprise'],
            'entreprise_id': d['id'],
            'nom':           d['nom'],
            'score_total':   round(total,        4),
            'score_cout':    round(sc_cout,       4),
            'score_delai':   round(sc_delai,      4),
            'score_taux':    round(sc_taux,       4),
            'score_zone':    1.0,
            'prix':          d['prix'],
            'delai_jours':   d['delai_tarif'],
            'taux_reussite': round(d['taux'] * 100, 1),
        })

    results.sort(key=lambda x: x['score_total'], reverse=True)
    return results


def generer_recommandation(commande):
    scores = calculer_scores(commande)

    scores_json = [
        {k: v for k, v in s.items() if k != 'entreprise'}
        for s in scores
    ]

    best = scores[0]['entreprise'] if scores else None

    reco, created = Recommandation.objects.get_or_create(
        commande=commande
    )

    if not reco.selection_manuelle:
        reco.entreprise_recommandee = best
        if not reco.entreprise_choisie:
            reco.entreprise_choisie = best

    reco.scores_details = scores_json
    reco.save()

    if best:
        Notification.objects.create(
            utilisateur=best.user,
            titre='Nouvelle commande assignée',
            message=(
                f'La commande {commande.reference} vous a été assignée '
                f'via le système de recommandation.'
            )
        )

    return reco