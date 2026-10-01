import { endOfMonth, format, getDay, parseISO, startOfMonth } from 'date-fns';
import { frCA } from 'date-fns/locale';

import { ajouterJours, dateISO } from './temps';
import type { Quart } from './types';

/**
 * Ce que montrent les trois vues de l'horaire. Un quart appartient au jour où
 * il commence, quart de nuit compris : il se range par sa date, jamais par
 * l'heure où il finit.
 */

export type Vue = 'jour' | 'semaine' | 'mois';

export function quartsDuJour<Q extends Pick<Quart, 'date' | 'heure_debut'>>(quarts: Q[], jour: string): Q[] {
  return quarts
    .filter((q) => q.date === jour)
    .sort((a, b) => (a.heure_debut < b.heure_debut ? -1 : a.heure_debut > b.heure_debut ? 1 : 0));
}

/** Lundi = 0, dimanche = 6 : la semaine québécoise du calendrier de travail. */
function rangDansSemaine(jour: string): number {
  return (getDay(parseISO(jour)) + 6) % 7;
}

export function lundiDe(jour: string): string {
  return ajouterJours(jour, -rangDansSemaine(jour));
}

/** Les sept jours de la semaine d'une date, du lundi au dimanche. */
export function joursDeLaSemaine(jour: string): string[] {
  const lundi = lundiDe(jour);
  return Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
}

/**
 * La grille d'un mois : des semaines entières, du lundi au dimanche. Les jours
 * qui débordent du mois valent `null` — une case vide, pas le 29 du mois
 * d'avant qu'on prendrait pour un jour de celui-ci.
 */
export function grilleDuMois(jour: string): (string | null)[][] {
  const premier = dateISO(startOfMonth(parseISO(jour)));
  const dernier = dateISO(endOfMonth(parseISO(jour)));
  const cases: (string | null)[] = Array.from({ length: rangDansSemaine(premier) }, () => null);
  for (let j = premier; j <= dernier; j = ajouterJours(j, 1)) cases.push(j);
  while (cases.length % 7 !== 0) cases.push(null);
  return Array.from({ length: cases.length / 7 }, (_, i) => cases.slice(i * 7, i * 7 + 7));
}

/** Le jour qu'on montre après « précédent » ou « suivant », selon la vue. */
export function decaler(jour: string, vue: Vue, sens: 1 | -1): string {
  if (vue === 'jour') return ajouterJours(jour, sens);
  if (vue === 'semaine') return ajouterJours(jour, 7 * sens);
  const d = parseISO(jour);
  // Le premier du mois voisin : le 31 janvier plus un mois n'existe pas.
  return dateISO(new Date(d.getFullYear(), d.getMonth() + sens, 1));
}

const lire = (jour: string, motif: string) => format(parseISO(jour), motif, { locale: frCA });

/** « jeudi 1 octobre 2026 », « 28 sept. au 4 oct. 2026 », « octobre 2026 ». */
export function titreDeLaVue(jour: string, vue: Vue): string {
  if (vue === 'jour') return lire(jour, 'EEEE d MMMM yyyy');
  if (vue === 'mois') return lire(jour, 'MMMM yyyy');
  const [debut, , , , , , fin] = joursDeLaSemaine(jour);
  return `${lire(debut, 'd MMM')} au ${lire(fin, 'd MMM yyyy')}`;
}

/** « lun. 28 », pour une ligne de la vue semaine. */
export function jourCourt(jour: string): string {
  return lire(jour, 'EEE d');
}

/** « jeudi 1 octobre », sous la grille du mois. */
export function jourLong(jour: string): string {
  return lire(jour, 'EEEE d MMMM');
}

export const INITIALES_SEMAINE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
