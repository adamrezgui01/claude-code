import type { FraisExtra, QuartDetaille } from '../db/types';
import { ajouterMois, analyserDate, aujourdhui, debutMois, finMois } from './dates';
import { calculerStatistiques } from './stats';

/**
 * Séries mensuelles du graphique. Toujours douze mois, même vides : un mois
 * sans quart vaut une barre à zéro, pas un trou dans la série.
 */

export type Mesure = 'argent' | 'heures' | 'kilometres';

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
