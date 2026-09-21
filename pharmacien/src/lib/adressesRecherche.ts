import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Adresse } from '../db/types';
import { adresseRenseignee, adresseUneLigne, formaterCodePostal } from './adresses';
import { estAuQuebec, FOYER_DEFAUT, parametresDePortee, type Point, type Portee } from './portee';

// Réexportées : les écrans parlent de portée sans avoir à connaître `portee`.
export type { Point, Portee };

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
const RECHERCHE = 'https://api.openrouteservice.org/geocode/search';

const FOYER = FOYER_DEFAUT;

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
  /**
   * Nom du commerce, quand le résultat en est un. C'est la bannière
   * d'OpenStreetMap — « Jean Coutu » — pas le nom légal de la pharmacie, qui
   * est celui du pharmacien propriétaire. L'usager le corrigera souvent.
   */
  nom: string;
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

/**
 * Couches interrogées. `venue` couvre les commerces d'OpenStreetMap, donc les
 * pharmacies : taper « Jean Coutu Sainte-Foy » ramène la succursale et son
 * adresse dans la même liste que les adresses. Une seule barre de recherche,
 * jamais deux.
 */
const COUCHES = 'venue,address,street,locality';

/** Même seuil que la saisie différée : en deçà, la recherche n'apprend rien. */
const MINIMUM_CARACTERES = 3;

/** Six suffisent : au-delà, la liste demande de lire plutôt que de choisir. */
const TAILLE = 6;

function construireUrl(
  service: string,
  recherche: string,
  cle: string,
  foyer: Point,
  portee: Portee
): string {
  const parametres = new URLSearchParams({
    api_key: cle.trim(),
    text: recherche.trim(),
    layers: COUCHES,
    size: `${TAILLE}`,
    ...parametresDePortee(portee, foyer),
  });
  return `${service}?${parametres.toString()}`;
}

/** La clé ne doit jamais se retrouver dans les journaux. */
function sansCle(url: string): string {
  return url.replace(/api_key=[^&]*/, 'api_key=…');
}

/**
 * Adresses proposées pendant la frappe.
 *
 * Deux services sont interrogés dans l'ordre. `autocomplete` répond vite mais
 * travaille par préfixe : il rate des adresses complètes, surtout hors des
 * grands centres. `search` les retrouve. Le second n'est appelé que si le
 * premier ne donne rien, donc le cas courant reste à un seul appel.
 */
export async function chercherAdresses(
  recherche: string,
  cle: string,
  foyer: Point = FOYER,
  portee: Portee = 'domicile',
  signal?: AbortSignal
): Promise<ResultatRecherche> {
  if (recherche.trim().length < MINIMUM_CARACTERES) return { suggestions: [] };
  if (!cle.trim()) {
    return { suggestions: [], erreur: 'Aucune clé OpenRouteService dans vos paramètres.' };
  }

  const premier = await interroger(
    construireUrl(AUTOCOMPLETE, recherche, cle, foyer, portee),
    portee,
    signal
  );
  if (premier.suggestions.length > 0 || premier.refus) return premier;

  const second = await interroger(
    construireUrl(RECHERCHE, recherche, cle, foyer, portee),
    portee,
    signal
  );
  if (second.suggestions.length > 0) return second;
  return second.erreur ? second : { suggestions: [], erreur: 'Aucune adresse trouvée.' };
}

/** Un appel à l'un des deux services de géocodage. */
async function interroger(
  url: string,
  portee: Portee,
  signal?: AbortSignal
): Promise<ResultatRecherche & { refus?: boolean }> {
  try {
    const reponse = await fetch(url, { signal });
    if (!reponse.ok) {
      const corps = await reponse.text().catch(() => '');
      console.warn(`[adresses] ${reponse.status} ${sansCle(url)} — ${corps.slice(0, 300)}`);
      const refus = reponse.status === 401 || reponse.status === 403;
      return {
        suggestions: [],
        refus,
        erreur: refus
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
      // Le rectangle envoyé au service déborde sur l'Ontario et le
      // Nouveau-Brunswick : c'est ici qu'on tranche pour de bon.
      if (portee === 'pharmacie' && !estAuQuebec(p)) return [];
      const nomLieu = texte(p.name);
      const rue = texte(p.street);
      // Un commerce n'a pas toujours de rue ni de numéro dans OpenStreetMap.
      // On garde ce qu'il y a et l'usager complète : écarter un résultat
      // incomplet reviendrait à cacher la pharmacie qu'il cherche.
      if (!rue && !nomLieu) return [];
      // C'est la couche qui dit ce qu'est le résultat. Le champ « name » ne le
      // dit pas : pour une simple adresse, il vaut le numéro suivi de la rue.
      const estCommerce = texte(p.layer) === 'venue';
      return [
        {
          cle: `${texte(p.gid) || index}`,
          nom: estCommerce ? nomLieu : '',
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

    return { suggestions };
  } catch (e) {
    console.warn(`[adresses] échec réseau ${sansCle(url)} — ${String(e)}`);
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
