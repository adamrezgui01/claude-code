import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Adresse } from '../db/types';
import { adresseRenseignee, adresseUneLigne, formaterCodePostal } from './adresses';

/**
 * Le côté réseau de la saisie d'adresses. Le chemin normal est
 * l'autocomplétion : l'usager tape, il touche la bonne adresse, tous les champs
 * se remplissent, coordonnées comprises. Le repli manuel existe pour les
 * pharmacies trop récentes pour figurer dans la base, et pour les moments sans
 * connexion.
 *
 * Le service est OpenRouteService, avec la même clé que le calcul de distance.
 * Tout le fournisseur est contenu ici : en changer n'affecte rien d'autre.
 */

const AUTOCOMPLETE = 'https://api.openrouteservice.org/geocode/autocomplete';

/** Biais vers le Québec : Montréal sert de point de référence. */
const FOYER = { lat: 45.5019, lon: -73.5674 };

const REGIONS: Record<string, string> = {
  quebec: 'Québec',
  québec: 'Québec',
  qc: 'Québec',
  ontario: 'Ontario',
  on: 'Ontario',
  'new brunswick': 'Nouveau-Brunswick',
  'nouveau-brunswick': 'Nouveau-Brunswick',
  nb: 'Nouveau-Brunswick',
  'nova scotia': 'Nouvelle-Écosse',
  ns: 'Nouvelle-Écosse',
  'prince edward island': 'Île-du-Prince-Édouard',
  pe: 'Île-du-Prince-Édouard',
  'newfoundland and labrador': 'Terre-Neuve-et-Labrador',
  nl: 'Terre-Neuve-et-Labrador',
  manitoba: 'Manitoba',
  mb: 'Manitoba',
  saskatchewan: 'Saskatchewan',
  sk: 'Saskatchewan',
  alberta: 'Alberta',
  ab: 'Alberta',
  'british columbia': 'Colombie-Britannique',
  bc: 'Colombie-Britannique',
  yukon: 'Yukon',
  yt: 'Yukon',
  'northwest territories': 'Territoires du Nord-Ouest',
  nt: 'Territoires du Nord-Ouest',
  nunavut: 'Nunavut',
  nu: 'Nunavut',
};

export type SuggestionAdresse = {
  cle: string;
  libelle: string;
  adresse: Adresse;
};

/**
 * Le résultat porte la raison d'un échec plutôt que de rendre une liste vide.
 * Une recherche qui ne retourne rien sans rien dire est intestable : on ne sait
 * pas si la clé manque, si le service a refusé, ou s'il n'y a simplement aucune
 * adresse qui corresponde.
 */
export type ResultatRecherche = {
  suggestions: SuggestionAdresse[];
  erreur?: string;
};

function province(region: unknown): string {
  if (typeof region !== 'string') return 'Québec';
  return REGIONS[region.trim().toLowerCase()] ?? region;
}

function texte(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur : '';
}

/** Adresses proposées pendant la frappe. */
export async function chercherAdresses(
  recherche: string,
  cle: string
): Promise<ResultatRecherche> {
  if (recherche.trim().length < 4) return { suggestions: [] };
  if (!cle.trim()) {
    return { suggestions: [], erreur: 'Aucune clé OpenRouteService dans vos paramètres.' };
  }

  const url =
    `${AUTOCOMPLETE}?api_key=${encodeURIComponent(cle.trim())}` +
    `&text=${encodeURIComponent(recherche.trim())}` +
    `&boundary.country=CA&focus.point.lat=${FOYER.lat}&focus.point.lon=${FOYER.lon}&size=8`;

  // La clé ne doit jamais se retrouver dans les journaux.
  const urlSansCle = url.replace(/api_key=[^&]*/, 'api_key=…');

  try {
    const reponse = await fetch(url);
    if (!reponse.ok) {
      const corps = await reponse.text().catch(() => '');
      console.warn(`[adresses] ${reponse.status} ${urlSansCle} — ${corps.slice(0, 300)}`);
      return {
        suggestions: [],
        erreur:
          reponse.status === 401 || reponse.status === 403
            ? `Clé refusée par le service (${reponse.status}). Vérifiez-la dans Profil › Paramètres.`
            : `Le service d’adresses a répondu ${reponse.status}.`,
      };
    }
    const donnees = await reponse.json();
    const entrees: unknown[] = Array.isArray(donnees?.features) ? donnees.features : [];

    const suggestions = entrees.flatMap((entree, index) => {
      const p = (entree as { properties?: Record<string, unknown> })?.properties ?? {};
      const coordonnees = (entree as { geometry?: { coordinates?: number[] } })?.geometry
        ?.coordinates;
      const rue = texte(p.street) || texte(p.name);
      if (!rue) return [];
      return [
        {
          cle: `${texte(p.gid) || index}`,
          libelle: texte(p.label) || rue,
          adresse: {
            numero_civique: texte(p.housenumber),
            rue,
            local: '',
            code_postal: formaterCodePostal(texte(p.postalcode)),
            ville: texte(p.locality) || texte(p.localadmin) || texte(p.county),
            province: province(p.region),
            longitude: coordonnees?.[0] ?? null,
            latitude: coordonnees?.[1] ?? null,
          },
        },
      ];
    });

    return {
      suggestions,
      erreur: suggestions.length === 0 ? 'Aucune adresse trouvée.' : undefined,
    };
  } catch (e) {
    console.warn(`[adresses] échec réseau ${urlSansCle} — ${String(e)}`);
    return { suggestions: [], erreur: 'La recherche n’a pas abouti. Vérifiez votre connexion.' };
  }
}

/**
 * Localise une adresse saisie à la main, avec le géocodeur du système. Retourne
 * `null` sans bloquer : une pharmacie sans coordonnées s'enregistre quand même,
 * elle n'apparaît simplement pas sur la carte.
 */
export async function localiserAdresse(
  a: Adresse
): Promise<{ latitude: number; longitude: number } | null> {
  if (!adresseRenseignee(a)) return null;
  try {
    if (Platform.OS === 'android') {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return null;
    }
    const [point] = await Location.geocodeAsync(adresseUneLigne(a));
    if (!point) return null;
    return { latitude: point.latitude, longitude: point.longitude };
  } catch {
    return null;
  }
}
