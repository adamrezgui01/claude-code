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

function province(region: unknown): string {
  if (typeof region !== 'string') return 'Québec';
  return REGIONS[region.trim().toLowerCase()] ?? region;
}

function texte(valeur: unknown): string {
  return typeof valeur === 'string' ? valeur : '';
}

/** Adresses proposées pendant la frappe. Retourne une liste vide sans clé. */
export async function chercherAdresses(
  recherche: string,
  cle: string
): Promise<SuggestionAdresse[]> {
  if (recherche.trim().length < 4 || !cle.trim()) return [];

  const url =
    `${AUTOCOMPLETE}?api_key=${encodeURIComponent(cle.trim())}` +
    `&text=${encodeURIComponent(recherche.trim())}` +
    `&boundary.country=CA&focus.point.lat=${FOYER.lat}&focus.point.lon=${FOYER.lon}&size=8`;

  try {
    const reponse = await fetch(url);
    if (!reponse.ok) return [];
    const donnees = await reponse.json();
    const entrees: unknown[] = Array.isArray(donnees?.features) ? donnees.features : [];

    return entrees.flatMap((entree, index) => {
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
  } catch {
    return [];
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
