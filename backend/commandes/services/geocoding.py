from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import time
import re


def _nettoyer_adresse(adresse: str) -> str:
    """
    Supprime les parties très spécifiques qui bloquent Nominatim :
    numéros d'appartement, résidences, étages, etc.
    Ex: "Résidence El Hana, Appartement 45, Avenue Bourguiba"
        → "Avenue Bourguiba"
    """
    # Supprimer "Résidence X," au début
    adresse = re.sub(r'(?i)r[eé]sidence\s+[\w\s]+,?\s*', '', adresse)
    # Supprimer "Appartement X," / "Appt X," / "App X,"
    adresse = re.sub(r'(?i)ap+a?r?t(?:ement)?\s*\d+,?\s*', '', adresse)
    # Supprimer "Bloc X," / "Bâtiment X,"
    adresse = re.sub(r'(?i)(bloc|b[aâ]timent)\s+\w+,?\s*', '', adresse)
    # Supprimer "Étage X," / "Niveau X,"
    adresse = re.sub(r'(?i)(étage|niveau)\s+\d+,?\s*', '', adresse)
    # Supprimer les virgules en début/fin
    adresse = adresse.strip().strip(',').strip()
    return adresse


def geocode_address(dest_adresse: str, dest_gouvernorat: str = None) -> tuple[float | None, float | None]:
    """
    Convertit une adresse tunisienne en latitude / longitude.
    Utilise Nominatim (OpenStreetMap) — gratuit.

    Stratégie de fallback progressive :
    1. Adresse complète + gouvernorat + Tunisia
    2. Adresse nettoyée (sans résidence/appart) + gouvernorat + Tunisia
    3. Adresse nettoyée seule + Tunisia
    4. Gouvernorat seul + Tunisia  (coordonnées approximatives de la ville)
    """
    if not dest_adresse or not dest_adresse.strip():
        # Fallback direct sur le gouvernorat si adresse vide
        if dest_gouvernorat:
            return _geocode_query(f"{dest_gouvernorat}, Tunisia")
        return None, None

    adresse_brute   = dest_adresse.strip()
    adresse_propre  = _nettoyer_adresse(adresse_brute)

    # Construction des candidats à essayer dans l'ordre
    candidats = []

    if dest_gouvernorat:
        candidats.append(f"{adresse_brute}, {dest_gouvernorat}, Tunisia")
        if adresse_propre and adresse_propre != adresse_brute:
            candidats.append(f"{adresse_propre}, {dest_gouvernorat}, Tunisia")

    candidats.append(f"{adresse_brute}, Tunisia")

    if adresse_propre and adresse_propre != adresse_brute:
        candidats.append(f"{adresse_propre}, Tunisia")

    if dest_gouvernorat:
        candidats.append(f"{dest_gouvernorat}, Tunisia")

    # Dédupliquer en conservant l'ordre
    vus = set()
    candidats_uniques = []
    for c in candidats:
        if c not in vus:
            vus.add(c)
            candidats_uniques.append(c)

    for query in candidats_uniques:
        lat, lng = _geocode_query(query)
        if lat is not None and lng is not None:
            print(f"[Geocoding] Trouvé avec : '{query}' → ({lat}, {lng})")
            return lat, lng

    print(f"[Geocoding] ✗ Aucune coordonnée trouvée pour : '{dest_adresse}'")
    return None, None


def _geocode_query(query: str) -> tuple[float | None, float | None]:
    """
    Effectue une seule requête Nominatim et retourne (lat, lng) ou (None, None).
    Respecte la limite de 1 req/sec de Nominatim.
    """
    geolocator = Nominatim(
        user_agent="LogiSync-Tunisie-App",
        timeout=10
    )

    try:
        location = geolocator.geocode(query, addressdetails=True, language='fr')
        if location and location.latitude and location.longitude:
            return round(location.latitude, 7), round(location.longitude, 7)
        # Pause courtoise même en cas d'échec (pas de résultat)
        time.sleep(0.8)
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        print(f"[Geocoding] Timeout/ServiceError pour '{query}': {e}")
        time.sleep(1.5)
    except Exception as e:
        print(f"[Geocoding] Erreur inattendue pour '{query}': {e}")
        time.sleep(0.5)

    return None, None