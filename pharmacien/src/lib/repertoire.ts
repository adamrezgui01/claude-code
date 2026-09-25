import type { Adresse } from '../db/types';
import { ligneVille } from './adresses';
import { decalerMois } from './dates';
import { normaliser } from './texte';

/**
 * Chercher une pharmacie dans le répertoire.
 *
 * Trois façons de la retrouver, parce qu'on ne s'en souvient pas toujours de
 * la même : son nom, sa ville, et le surnom qu'on lui donne — qui est souvent
 * le seul nom dont on se souvienne vraiment.
 *
 * La même fonction sert au répertoire et au sélecteur d'une fiche de quart :
 * chercher au même endroit doit donner la même chose aux deux.
 */
export function filtrerPharmacies<T extends Adresse & { nom: string; surnom: string }>(
  pharmacies: T[],
  recherche: string
): T[] {
  const terme = normaliser(recherche.trim());
  if (!terme) return pharmacies;
  return pharmacies.filter(
    (p) =>
      normaliser(p.nom).includes(terme) ||
      normaliser(p.surnom).includes(terme) ||
      normaliser(ligneVille(p)).includes(terme)
  );
}

/**
 * Une pharmacie qui annule.
 *
 * Trois annulations en douze mois, c'est un motif, pas un accident : ça se
 * dit, une fois, là où l'on choisit chez qui aller. Deux arrivent à tout le
 * monde ; signaler là, c'est apprendre à l'usager à ne plus lire le signal.
 *
 * Ne comptent que celles de la pharmacie. Un quart que l'usager a annulé
 * lui-même reste sur la fiche — c'est de l'histoire — mais ne dit rien sur la
 * pharmacie, et c'est la pharmacie qu'on signale. Celles dont on ne sait pas
 * qui les a faites ne comptent pas non plus : on n'impute pas un tort à
 * quelqu'un sur une absence d'information.
 */
export const SEUIL_ANNULATIONS = 3;
export const FENETRE_ANNULATIONS_MOIS = 12;

type Annulation = { date: string; annule_par?: string };

/**
 * Les annulations imputables à la pharmacie, dans la fenêtre. Les quarts à
 * venir en font partie : une annulation qui vient d'arriver est le cas le plus
 * parlant, le remplacement de la semaine prochaine est à refaire.
 */
export function annulationsImputables<T extends Annulation>(annules: T[], aujourdhui: string): T[] {
  const depuis = decalerMois(aujourdhui, -FENETRE_ANNULATIONS_MOIS);
  return annules.filter((a) => a.annule_par === 'pharmacie' && a.date >= depuis);
}

export function pharmacieQuiAnnule(annules: Annulation[], aujourdhui: string): boolean {
  return annulationsImputables(annules, aujourdhui).length >= SEUIL_ANNULATIONS;
}
