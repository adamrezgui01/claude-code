import { ajouterMois, aujourdhui, debutMois, finMois } from './dates';

export type Preset = 'douzeMois' | 'mois' | 'moisDernier' | 'trimestre' | 'personnalisee';

/**
 * La période à l'ouverture : douze mois.
 *
 * Un remplaçant regarde son année, pas sa semaine. Et le graphique en dessous
 * couvre déjà douze mois : les deux disent enfin la même chose, au lieu de
 * montrer un total de septembre au-dessus d'une courbe qui part d'octobre
 * dernier.
 */
export const PRESET_DEFAUT: Preset = 'douzeMois';

/** Bornes de la période choisie, au format `AAAA-MM-JJ`. */
export function bornes(preset: Preset, debut: string, fin: string): [string, string] {
  const ceJour = aujourdhui();
  switch (preset) {
    case 'mois':
      return [debutMois(ceJour), finMois(ceJour)];
    case 'moisDernier': {
      const mois = ajouterMois(ceJour, -1);
      return [debutMois(mois), finMois(mois)];
    }
    case 'trimestre':
      return [debutMois(ajouterMois(ceJour, -2)), finMois(ceJour)];
    // Onze mois en arrière plus le mois courant : exactement la fenêtre du
    // graphique, qui compte ses douze mois de la même façon.
    case 'douzeMois':
      return [debutMois(ajouterMois(ceJour, -11)), finMois(ceJour)];
    default:
      return [debut, fin];
  }
}

/**
 * Un quart appartient à la date de son début, et à elle seule.
 *
 * La question se pose pour les quarts de nuit : celui du 31 octobre 22 h au
 * 1er novembre 7 h pourrait se réclamer des deux mois. Le couper en deux
 * obligerait à répartir neuf heures et un montant entre octobre et novembre,
 * et une facture d'octobre ne pourrait plus le porter tel quel. Il compte donc
 * en entier en octobre — le jour où l'usager s'est présenté au travail.
 *
 * Les bornes sont incluses des deux côtés.
 */
export function quartDansPeriode(
  quart: { date: string },
  debut: string,
  fin: string
): boolean {
  return quart.date >= debut && quart.date <= fin;
}

/** Les quarts d'une période, filtrés en mémoire par la même règle. */
export function quartsDeLaPeriode<T extends { date: string }>(
  quarts: T[],
  debut: string,
  fin: string
): T[] {
  return quarts.filter((q) => quartDansPeriode(q, debut, fin));
}
