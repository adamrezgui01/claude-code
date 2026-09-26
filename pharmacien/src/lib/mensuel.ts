import type { FraisExtra, QuartDetaille } from '../db/types';
import { argent, heures, nombre } from './format';
import { LANGUE_DEFAUT, type Langue } from './langue';
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

/**
 * L'étiquette d'une valeur, sur le graphique.
 *
 * En kilomètres, les valeurs entraient : `1 232`, cinq caractères pour douze
 * colonnes. En argent, elles étaient coupées — `8 56…` — parce qu'on écrivait
 * `8 563,40 $`, dix caractères pour la même largeur.
 *
 * Le problème n'est pas le graphique, c'est le format. Les cents d'un total
 * mensuel sont du bruit : personne ne lit la différence entre 8 563,40 et
 * 8 563,90 sur une barre. Et le symbole est redondant, puisque l'onglet Argent
 * est sélectionné. Même raisonnement pour les minutes d'un total d'heures.
 *
 * C'est un format d'**affichage**, et rien d'autre : le montant reste calculé
 * et arrondi une seule fois, sur le quart. Partout ailleurs — totaux, fiches,
 * factures — il garde ses cents et son symbole.
 */
export function etiquetteDuGraphique(
  valeur: number,
  mesure: Mesure,
  langue: Langue = LANGUE_DEFAUT
): string {
  // La barre est déjà au sol : un « 0 » posé dessus n'ajoute rien.
  if (valeur === 0) return '';
  if (mesure === 'heures') return heuresGraphique(valeur, langue);
  return nombreCourt(valeur, langue);
}

/**
 * Six caractères est la largeur qui fonctionne — c'est celle des kilomètres,
 * qui entraient déjà. Au-delà, la colonne coupe et les points de suspension
 * reviennent. Deux paliers suffisent à tenir cette largeur jusqu'aux millions.
 */
const SEUIL_MILLIERS = 100000;
const SEUIL_MILLIONS = 1000000;

function nombreCourt(valeur: number, langue: Langue): string {
  // On arrondit avant de comparer : 999 999 donne mille milliers, et
  // « 1 000 k » ferait sept caractères — un de trop, et c'est celui qui coupe.
  const milliers = Math.round(valeur / 1000);
  if (milliers >= 1000) return `${nombre(valeur / SEUIL_MILLIONS, 1, langue)} M`;
  if (valeur >= SEUIL_MILLIERS) return `${nombre(milliers, 0, langue)} k`;
  return nombre(Math.round(valeur), 0, langue);
}

/**
 * Un total d'heures à l'heure près : « 168 h », jamais « 168 h 30 ». Une
 * demi-heure sur un mois ne se lit pas sur une barre, et « 168 h 30 » fait
 * huit caractères — il se coupe exactement comme le montant se coupait.
 *
 * Au-delà de quatre chiffres, le « h » ne tient plus : l'unité est déjà dite
 * par l'onglet sélectionné, comme le symbole du dollar.
 */
const SEUIL_HEURES_NUES = 10000;

function heuresGraphique(total: number, langue: Langue): string {
  const arrondi = Math.round(total);
  if (arrondi >= SEUIL_HEURES_NUES) return nombreCourt(arrondi, langue);
  return langue === 'en' ? `${arrondi}h` : `${arrondi} h`;
}

/**
 * La valeur exacte, celle que la bulle montre sous le doigt. La précision
 * reste accessible ; elle n'encombre plus la rangée.
 */
export function valeurComplete(
  valeur: number,
  mesure: Mesure,
  langue: Langue = LANGUE_DEFAUT
): string {
  if (mesure === 'argent') return argent(valeur, langue);
  if (mesure === 'heures') return heures(valeur, langue);
  return `${nombre(valeur, 0, langue)} km`;
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
