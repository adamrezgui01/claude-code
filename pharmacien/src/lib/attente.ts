/**
 * La bande d'attente : ce qui traîne, écrit une fois, en haut de l'horaire.
 *
 * C'est le pendant du rendez-vous du soir, et les deux se partagent le travail.
 * La notification ne compte rien : « 4 révisions, 2 factures » sur un écran
 * verrouillé se balaie sans y penser. Une fois l'application ouverte, au
 * contraire, un chiffre est exactement ce qu'on cherche — il dit s'il y a dix
 * minutes de travail ou une heure, et si ça se fait maintenant ou ce soir.
 *
 * Elle ne vit que dans l'horaire. Répétée sur quatre onglets, elle devient du
 * décor, et on cesse de la lire là où elle comptait.
 */

export type GenreAttente =
  /** Des quarts finis dont les heures réelles n'ont pas été confirmées. */
  | 'heures'
  /** Des quarts faits, pas encore portés sur une facture. */
  | 'aFacturer'
  /** Des factures envoyées et toujours impayées. */
  | 'factures'
  /** Des documents professionnels qui approchent de leur expiration. */
  | 'documents';

/**
 * L'ordre d'urgence.
 *
 * Les heures d'abord : elles changent un montant qui n'est pas encore facturé,
 * et la fenêtre pour les corriger se referme dès qu'une facture part. Ensuite ce
 * qui n'est pas facturé — c'est l'étape qui rapporte —, puis ce qui n'est pas
 * payé, puis les papiers.
 *
 * Les révisions n'y sont pas, et ce n'est pas un oubli : l'horaire appartient au
 * volet organisation, qui n'importe rien du volet clinique. L'onglet Clinique
 * porte déjà ce qu'il y a à revoir, en haut de son propre écran, et le
 * rendez-vous du soir les annonce tous les deux.
 */
export const GENRES_ATTENTE: GenreAttente[] = ['heures', 'aFacturer', 'factures', 'documents'];

/**
 * Trois lignes au plus. Au-delà, la bande occupe le haut de l'écran et pousse
 * l'horaire hors de vue — or c'est l'horaire qu'on est venu voir.
 */
export const LIGNES_MAX = 3;

export type ComptesAttente = Record<GenreAttente, number>;

export type LigneAttente = { genre: GenreAttente; compte: number };

export type BandeAttente = {
  lignes: LigneAttente[];
  /** Combien de sortes attendent derrière « Voir tout ». */
  reste: number;
};

export function bandeAttente(comptes: ComptesAttente): BandeAttente {
  // Ce qui est à zéro ne prend pas de ligne : « 0 facture impayée » est une
  // ligne qu'on apprend à ne plus lire, et elle emporte avec elle celles qui ne
  // sont pas à zéro.
  const toutes = GENRES_ATTENTE.filter((genre) => comptes[genre] > 0).map((genre) => ({
    genre,
    compte: comptes[genre],
  }));
  return {
    lignes: toutes.slice(0, LIGNES_MAX),
    reste: Math.max(0, toutes.length - LIGNES_MAX),
  };
}

/**
 * Écartée pour la journée, pas pour toujours.
 *
 * Un balayage vers la droite la fait taire jusqu'au lendemain. Ce qui traîne
 * traîne encore demain, et une bande qu'on pourrait faire taire définitivement
 * finirait par cacher une facture de mille dollars.
 *
 * Une date d'écart postérieure à aujourd'hui ne la musèle pas : une horloge
 * reculée ou un changement de fuseau ne doit pas suffire à l'éteindre.
 */
export function bandeEcartee(ecarteeLe: string, aujourdhui: string): boolean {
  return !!ecarteeLe && ecarteeLe === aujourdhui;
}
