"""PubChem name-to-SMILES lookup service."""
from __future__ import annotations

from functools import lru_cache
import json
from urllib.parse import quote
from urllib.request import urlopen

import requests

PUBCHEM_URL = (
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{}/property/CanonicalSMILES/JSON"
)
CACTUS_URL = "https://cactus.nci.nih.gov/chemical/structure/{}/smiles"
PUBCHEM_AUTOCOMPLETE_TEMPLATE = (
    "https://pubchem.ncbi.nlm.nih.gov/rest/autocomplete/compound/"
    "{query}/json?limit={limit}"
)


NAME_LOOKUP_TIMEOUT_SECONDS = 10


def _sanitize_lookup_name(name: str) -> str:
    normalized = (name or "").strip()
    if not normalized or len(normalized) > 200:
        return ""
    if any(ord(char) < 32 or ord(char) == 127 for char in normalized):
        return ""
    return normalized


@lru_cache(maxsize=500)
def get_smiles_from_name(name: str) -> str | None:
    """Resolve a chemical name to SMILES via PubChem, then NIH Cactus fallback."""
    normalized = _sanitize_lookup_name(name)
    if not normalized:
        return None

    try:
        encoded = quote(normalized)
        pubchem_url = PUBCHEM_URL.format(encoded)
        response = requests.get(pubchem_url, timeout=NAME_LOOKUP_TIMEOUT_SECONDS)
        if response.status_code == 200:
            data = response.json()
            properties = data.get("PropertyTable", {}).get("Properties", [])
            if properties:
                smiles = properties[0].get("CanonicalSMILES")
                if smiles:
                    return smiles

        cactus_url = CACTUS_URL.format(encoded)
        response = requests.get(cactus_url, timeout=NAME_LOOKUP_TIMEOUT_SECONDS)
        if response.status_code == 200:
            smiles = response.text.strip()
            if smiles:
                return smiles
    except Exception:
        pass

    return None


def suggest_chemical_names(query: str, limit: int = 8) -> list[str]:
    """Return PubChem autocomplete suggestions for a query."""
    normalized = _sanitize_lookup_name(query)
    if not normalized:
        return []

    safe_limit = max(1, min(int(limit or 8), 20))
    url = PUBCHEM_AUTOCOMPLETE_TEMPLATE.format(
        query=quote(normalized),
        limit=safe_limit,
    )
    try:
        with urlopen(url, timeout=NAME_LOOKUP_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except Exception:
        return []

    terms = payload.get("dictionary_terms", {}).get("compound", [])
    if not isinstance(terms, list):
        return []

    return [str(item).strip() for item in terms if str(item).strip()]
