import type { Adresse } from '../db/types';
import { ligneVille } from './adresses';
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
