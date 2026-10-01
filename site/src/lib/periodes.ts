import { addMonths, endOfMonth, parseISO, startOfMonth } from 'date-fns';

import { dateISO } from './temps';

/**
 * Les périodes des statistiques, dans l'ordre du prompt : Mois dernier · Ce
 * mois · 3 mois · 12 mois · Autre. Douze mois à l'ouverture : un remplaçant
 * regarde son année, et le graphique en dessous couvre déjà douze mois.
 */
export type Periode = 'moisDernier' | 'mois' | 'trimestre' | 'douzeMois' | 'autre';

export const PERIODES: { valeur: Periode; texte: string }[] = [
  { valeur: 'moisDernier', texte: 'Mois dernier' },
  { valeur: 'mois', texte: 'Ce mois' },
  { valeur: 'trimestre', texte: '3 mois' },
  { valeur: 'douzeMois', texte: '12 mois' },
  { valeur: 'autre', texte: 'Autre' },
];

export const PERIODE_DEFAUT: Periode = 'douzeMois';

const debut = (jour: string, mois: number) => dateISO(startOfMonth(addMonths(parseISO(jour), mois)));
const fin = (jour: string, mois: number) => dateISO(endOfMonth(addMonths(parseISO(jour), mois)));

/** Les bornes d'une période, incluses des deux côtés. */
export function bornes(periode: Periode, aujourdhui: string, autre: [string, string]): [string, string] {
  switch (periode) {
    case 'moisDernier':
      return [debut(aujourdhui, -1), fin(aujourdhui, -1)];
    case 'mois':
      return [debut(aujourdhui, 0), fin(aujourdhui, 0)];
    case 'trimestre':
      return [debut(aujourdhui, -2), fin(aujourdhui, 0)];
    // Onze mois en arrière plus le mois courant : la fenêtre du graphique.
    case 'douzeMois':
      return [debut(aujourdhui, -11), fin(aujourdhui, 0)];
    case 'autre':
      return autre[0] <= autre[1] ? autre : [autre[1], autre[0]];
  }
}

/**
 * Un quart appartient à la date de son début. Celui du 31 octobre 22 h au
 * 1er novembre 7 h compte en entier en octobre.
 */
export function quartsDeLaPeriode<T extends { date: string }>(quarts: T[], [de, a]: [string, string]): T[] {
  return quarts.filter((q) => q.date >= de && q.date <= a);
}
