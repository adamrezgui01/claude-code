import type { FraisExtra, QuartDetaille } from '../db/types';
import { ajouterMois, analyserDate, aujourdhui, debutMois, finMois } from './dates';
import { calculerStatistiques } from './stats';

/**
 * Séries mensuelles du graphique. Toujours douze mois, même vides : un mois
 * sans quart vaut une barre à zéro, pas un trou dans la série.
 */

export type Mesure = 'argent' | 'heures' | 'kilometres';
export type Forme = 'barres' | 'ligne';

/**
 * L'argent d'abord : c'est la question qu'on se pose en ouvrant l'écran. Cet
 * ordre est celui du sélecteur visible **et** celui du balayage ; deux ordres
 * différents donneraient deux applications dans la même.
 */
export const MESURES: Mesure[] = ['argent', 'heures', 'kilometres'];

/**
 * La mesure voisine, en boucle. Un bord dur obligerait à revenir sur ses pas
 * pour atteindre la troisième.
 */
export function mesureVoisine(mesures: Mesure[], mesure: Mesure, decalage: -1 | 0 | 1): Mesure {
  const index = Math.max(0, mesures.indexOf(mesure));
  return mesures[(index + decalage + mesures.length) % mesures.length];
}

export type MoisChiffre = {
  /** Premier jour du mois, `AAAA-MM-01`. */
  mois: string;
  libelle: string;
  argent: number;
  heures: number;
  kilometres: number;
};

const MOIS_COURTS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export function libelleMois(iso: string): string {
  return MOIS_COURTS[analyserDate(iso).getMonth()];
}

/** Les douze derniers mois, du plus ancien au mois courant. */
export function douzeDerniersMois(ceJour = aujourdhui()): string[] {
  return Array.from({ length: 12 }, (_, i) => debutMois(ajouterMois(ceJour, i - 11)));
}

export function bornesDuMois(mois: string): [string, string] {
  return [debutMois(mois), finMois(mois)];
}

/**
 * Agrège mois par mois. Les quarts et les frais sont fournis par l'appelant,
 * ce qui garde ce calcul sans dépendance à la base.
 */
export function serieMensuelle(
  quartsParMois: (bornes: [string, string]) => {
    quarts: QuartDetaille[];
    frais: (FraisExtra & { pharmacie_id: number })[];
  },
  ceJour = aujourdhui()
): MoisChiffre[] {
  return douzeDerniersMois(ceJour).map((mois) => {
    const { quarts, frais } = quartsParMois(bornesDuMois(mois));
    const stats = calculerStatistiques(quarts, frais);
    return {
      mois,
      libelle: libelleMois(mois),
      argent: stats.revenuEstime,
      heures: stats.totalHeures,
      kilometres: stats.totalKm,
    };
  });
}

export function valeurDe(entree: MoisChiffre, mesure: Mesure): number {
  return mesure === 'argent' ? entree.argent : mesure === 'heures' ? entree.heures : entree.kilometres;
}

/** Plus haute valeur de la série, jamais nulle : une série vide garde son axe. */
export function maximum(serie: MoisChiffre[], mesure: Mesure): number {
  return Math.max(1, ...serie.map((e) => valeurDe(e, mesure)));
}

/**
 * Mois couverts par la période choisie. Le graphique garde ses douze mois — les
 * réduire à « Ce mois-ci » donnerait une barre unique, qui ne montre rien — mais
 * il met en valeur ceux que la période désigne.
 */
export function moisEnValeur(serie: MoisChiffre[], debut: string, fin: string): Set<string> {
  return new Set(serie.filter((e) => e.mois <= fin && finDuMois(e.mois) >= debut).map((e) => e.mois));
}

function finDuMois(mois: string): string {
  return bornesDuMois(mois)[1];
}
