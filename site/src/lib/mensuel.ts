import { addMonths, endOfMonth, parseISO, startOfMonth } from 'date-fns';

import { argent, heures, nombre } from './format';
import { quartsDeLaPeriode } from './periodes';
import { calculerStatistiques } from './stats';
import { dateISO } from './temps';
import type { Pharmacie, Quart } from './types';

/**
 * Le graphique des douze derniers mois, et le format de ses étiquettes.
 *
 * Toujours douze mois, même vides : un mois sans quart est une barre à zéro,
 * pas un trou dans la série.
 */

export type Mesure = 'argent' | 'heures' | 'kilometres';

export const MESURES: { valeur: Mesure; texte: string; icone: 'argent' | 'horloge' | 'voiture' }[] = [
  { valeur: 'argent', texte: 'Argent', icone: 'argent' },
  { valeur: 'heures', texte: 'Heures', icone: 'horloge' },
  { valeur: 'kilometres', texte: 'Kilomètres', icone: 'voiture' },
];

export type MoisChiffre = { mois: string; libelle: string; argent: number; heures: number; kilometres: number };

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Les douze derniers mois, du plus ancien au mois courant. */
export function douzeDerniersMois(aujourdhui: string): string[] {
  return Array.from({ length: 12 }, (_, i) => dateISO(startOfMonth(addMonths(parseISO(aujourdhui), i - 11))));
}

export function serieMensuelle(quarts: Quart[], pharmacies: Pharmacie[], aujourdhui: string): MoisChiffre[] {
  return douzeDerniersMois(aujourdhui).map((mois) => {
    const stats = calculerStatistiques(
      quartsDeLaPeriode(quarts, [mois, dateISO(endOfMonth(parseISO(mois)))]),
      pharmacies
    );
    return {
      mois,
      libelle: MOIS_COURTS[parseISO(mois).getMonth()],
      argent: stats.revenu,
      heures: stats.heures,
      kilometres: stats.km,
    };
  });
}

export function valeurDe(entree: MoisChiffre, mesure: Mesure): number {
  return mesure === 'argent' ? entree.argent : mesure === 'heures' ? entree.heures : entree.kilometres;
}

/** La plus haute valeur, jamais nulle : une série vide garde son axe. */
export function maximum(serie: MoisChiffre[], mesure: Mesure): number {
  return Math.max(1, ...serie.map((e) => valeurDe(e, mesure)));
}

/** Les mois que la période choisie couvre : le graphique les met en valeur. */
export function moisEnValeur(serie: MoisChiffre[], [de, a]: [string, string]): Set<string> {
  return new Set(
    serie.filter((e) => e.mois <= a && dateISO(endOfMonth(parseISO(e.mois))) >= de).map((e) => e.mois)
  );
}

/**
 * Le format des étiquettes se choisit **par graphique**, sur sa plus grande
 * valeur, et vaut pour les douze colonnes : mélanger « 8 564 » et « 10k » se
 * lit mal, l'œil compare des barres et non des unités.
 *
 * On abrège dès le millier, comme dans l'application. (Le prompt dit dix
 * mille ; l'application l'a corrigé : « 1 232 » fait vingt-huit points quand
 * la colonne d'un téléphone en offre vingt-six, et le seuil à dix mille
 * privait d'étiquettes presque tous les graphiques.)
 */
export const SEUIL_ABREGE = 1000;

export type Format = 'pleins' | 'milliers';

export function formatDuGraphique(max: number): Format {
  return max >= SEUIL_ABREGE ? 'milliers' : 'pleins';
}

/**
 * L'étiquette d'une barre. Un montant y perd ses cents et son symbole, un total
 * d'heures ses minutes : l'unité est dite par la mesure choisie. C'est un
 * format d'affichage ; partout ailleurs le montant garde ses cents.
 */
export function etiquette(valeur: number, mesure: Mesure, format: Format): string {
  // La barre est déjà au sol : un « 0 » posé dessus n'ajoute rien.
  if (valeur === 0) return '';
  if (format === 'milliers') return enMilliers(valeur);
  const entier = Math.round(valeur);
  return mesure === 'heures' ? `${nombre(entier, 0)} h` : nombre(entier, 0);
}

/**
 * `1,2k`, `9,7k`, puis `12k`, `124k`. La décimale ne survit qu'à un seul
 * chiffre de partie entière. Sous le millier, les chiffres restent nus :
 * « 0,1k » se lirait comme zéro.
 */
function enMilliers(valeur: number): string {
  if (valeur < 1000) return nombre(Math.round(valeur), 0);
  const milliers = valeur / 1000;
  if (Math.round(milliers) >= 1000) return `${nombre(valeur / 1_000_000, 1)}M`;
  if (milliers >= 10) return `${nombre(Math.round(milliers), 0)}k`;
  return `${nombre(milliers, 1)}k`;
}

/** Trois repères sur l'axe : le maximum, le milieu, zéro. */
export function reperesDeLAxe(max: number, mesure: Mesure, format: Format): { valeur: number; texte: string }[] {
  return [max, max / 2, 0].map((valeur) => ({
    valeur,
    // Le zéro s'écrit ici : c'est le bas de l'échelle, pas une barre vide.
    texte: valeur === 0 ? '0' : etiquette(valeur, mesure, format),
  }));
}

/** La valeur exacte, sous le pointeur : cents et symbole compris. */
export function valeurComplete(valeur: number, mesure: Mesure): string {
  if (mesure === 'argent') return argent(valeur);
  if (mesure === 'heures') return heures(valeur);
  return `${nombre(valeur, 0)} km`;
}

/**
 * La largeur d'une étiquette, estimée par classe de caractère, en pixels, à
 * onze pixels demi-gras : une virgule fait la moitié d'un chiffre.
 */
export function largeurEstimee(texte: string): number {
  let total = 0;
  for (const c of texte) total += c === ',' || c === '.' ? 3.1 : /\s/.test(c) ? 2.9 : 6.2;
  return total;
}

export const ECART_ETIQUETTES = 4;

/** Ce qui donne la largeur d'un texte : une mesure dans le navigateur, l'estimation ailleurs. */
export type Mesureur = (texte: string) => number;

/**
 * Une étiquette ne se tronque jamais. Si la plus large n'entre pas dans sa
 * colonne, aucune ne s'affiche : l'axe et la valeur sous le pointeur
 * suffisent. Jamais une rangée où certaines passent et d'autres non.
 */
export function etiquettesLisibles(largeurColonne: number, textes: string[], mesurer: Mesureur = largeurEstimee): boolean {
  const plusLarge = Math.max(0, ...textes.map(mesurer));
  return plusLarge === 0 || plusLarge + ECART_ETIQUETTES <= largeurColonne;
}

/**
 * Les mois sous les barres : « janv. » quand il entre, l'initiale sinon. Douze
 * abréviations qui se chevauchent ne se lisent pas ; douze initiales, si, dans
 * l'ordre où on les connaît. Le même format pour les douze, comme les
 * étiquettes des barres.
 */
export function libellesDesMois(serie: MoisChiffre[], largeurColonne: number, mesurer: Mesureur = largeurEstimee): string[] {
  const libelles = serie.map((e) => e.libelle);
  if (etiquettesLisibles(largeurColonne, libelles, mesurer)) return libelles;
  return libelles.map((l) => l.charAt(0).toUpperCase());
}
