import type { Quart } from '../db/types';
import { ajouterJours, debutMois, grilleMois } from './dates';

/**
 * Les jours libres, sur les prochaines semaines.
 *
 * Un propriétaire qui cherche un remplaçant demande « t'es libre quand ? », et
 * la réponse part par texto. Une image répond en un coup d'œil là où une liste
 * de dates demande à être lue.
 *
 * Ce qui sort d'ici ne contient aucun nom de pharmacie, aucune heure, aucun
 * montant : l'image circule dans des groupes, et ce qui n'a pas à en sortir
 * n'en sort pas.
 */

export type JourDisponible = {
  /** Format `AAAA-MM-JJ`. */
  date: string;
  /** Vrai dès qu'un quart commence ce jour-là, quelle que soit sa durée. */
  pris: boolean;
};

export type Disponibilites = {
  debut: string;
  fin: string;
  semaines: number;
  jours: JourDisponible[];
};

/** Les périodes proposées, en semaines. Quatre par défaut. */
export const SEMAINES = [2, 4, 8] as const;
export const SEMAINES_DEFAUT = 4;

/**
 * Un jour est pris dès qu'un quart y commence. Un quart de nuit ne prend donc
 * que le jour de son début : celui du jeudi 22 h au vendredi 7 h laisse le
 * vendredi libre, et l'usager peut l'offrir sans y penser à deux fois.
 */
export function disponibilites(
  quarts: Pick<Quart, 'date' | 'annule'>[],
  debut: string,
  semaines: number
): Disponibilites {
  const occupes = new Set(quarts.filter((q) => !q.annule).map((q) => q.date));
  const total = semaines * 7;
  const jours = Array.from({ length: total }, (_, i) => {
    const date = ajouterJours(debut, i);
    return { date, pris: occupes.has(date) };
  });
  return { debut, fin: jours[jours.length - 1].date, semaines, jours };
}

export type BlocMois = {
  /** Premier jour du mois, `AAAA-MM-01`. */
  mois: string;
  /**
   * Les semaines de la grille, du lundi au dimanche. Une case vaut `null`
   * quand elle sort du mois ou de la période : les jours d'avant le départ
   * restent vides, ni libres ni pris.
   */
  semaines: (JourDisponible | null)[][];
  /** Les jours de la période présents dans ce mois, à plat. */
  jours: JourDisponible[];
};

/**
 * Découpe la période en grilles de calendrier, une par mois. Une période de
 * quatre semaines chevauche presque toujours deux mois : deux blocs se lisent
 * mieux qu'une bande continue de vingt-huit cases.
 */
export function moisCouverts(disponibilites: Disponibilites): BlocMois[] {
  const parDate = new Map(disponibilites.jours.map((j) => [j.date, j]));
  const mois: string[] = [];
  for (const jour of disponibilites.jours) {
    const debut = debutMois(jour.date);
    if (!mois.includes(debut)) mois.push(debut);
  }

  return mois.map((premier) => ({
    mois: premier,
    semaines: grilleMois(premier).map((semaine) =>
      semaine.map((date) => (date ? (parDate.get(date) ?? null) : null))
    ),
    jours: disponibilites.jours.filter((j) => debutMois(j.date) === premier),
  }));
}

/** Compte les jours libres, pour l'écrire sous la grille. */
export function joursLibres(disponibilites: Disponibilites): number {
  return disponibilites.jours.filter((j) => !j.pris).length;
}
