import { listerQuarts } from '../db/quarts';
import { delaisSecondaires, obtenirReglages } from '../db/profil';
import { enregistrerRappels, rappelsDuQuart } from '../db/quarts';
import { annulerRappels, planifierRappelsQuart } from './notifications';
import { etatQuart } from './echeance';
import { replanifierVeille } from './veille/planifier';

/**
 * Reprogramme les rappels des quarts à venir.
 *
 * Le texte d'une notification est figé au moment où elle est programmée : le
 * système garde la phrase, pas une référence vers elle. Changer de langue ne
 * traduit donc rien de ce qui est déjà en file — il faut tout refaire. Les
 * quarts passés sont laissés tranquilles : leurs rappels sont derrière nous.
 *
 * La veille clinique passe par le même chemin, pour la même raison : sa
 * notification nomme des sujets, et ces noms sont traduits.
 */
export async function reprogrammerRappels() {
  const reglages = obtenirReglages();
  const delais = delaisSecondaires(reglages);
  const maintenant = Date.now();

  for (const quart of listerQuarts()) {
    if (etatQuart(quart, maintenant) === 'anterieur') continue;
    await annulerRappels(rappelsDuQuart(quart));
    const rappels = await planifierRappelsQuart(quart, delais);
    enregistrerRappels(quart.id, rappels.principal, rappels.secondaires, rappels.memo);
  }

  await replanifierVeille();
}
