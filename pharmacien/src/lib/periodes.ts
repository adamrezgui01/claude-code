import { ajouterMois, aujourdhui, debutMois, finMois } from './dates';

export type Preset = 'mois' | 'moisDernier' | 'trimestre' | 'personnalisee';

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
    default:
      return [debut, fin];
  }
}
