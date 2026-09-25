import { enregistrerRelance, reinitialiserRelance, supprimerFacture } from '../db/factures';
import type { Facture } from '../db/types';
import { annulerRappel } from './notifications';
import { joursEnAttente, relanceDue } from './relance';
import { replanifierRendezVous } from './reprogrammer';

/**
 * Relance des factures impayées.
 *
 * Pour un travailleur autonome, une facture oubliée est de l'argent réel : un
 * propriétaire laisse passer, et le trou se découvre des mois plus tard. Un
 * rappel unique, doux, part une fois le délai écoulé. Pas de répétition, pas
 * d'insistance.
 *
 * Depuis la 2.5, ce rappel n'a plus de notification à lui : il se dit au
 * rendez-vous du soir, le jour où le délai tombe. Ce qui reste ici, c'est de
 * tenir la file propre — un identifiant laissé par une version précédente
 * partirait encore, à 9 h, avec un texte périmé.
 */

/**
 * La facture entre en scène, ou son délai change. Rien à programmer : on
 * nettoie ce qui traînait et on refait le rendez-vous du soir, qui la nommera
 * le bon jour.
 */
export async function programmerRelance(facture: Facture, _delaiJours: number) {
  await annulerRappel(facture.notification_relance);
  enregistrerRelance(facture.id, null);
  await replanifierRendezVous();
}

/** La facture est payée, ou repasse en attente : le rendez-vous suit. */
export async function ajusterRelance(facture: Facture, delaiJours: number) {
  if (facture.statut_paiement === 'payee') {
    await annulerRelance(facture);
    await replanifierRendezVous();
    return;
  }
  // Repassée en attente : elle a de nouveau droit à un rappel.
  reinitialiserRelance(facture.id);
  await programmerRelance({ ...facture, relance_faite: 0 }, delaiJours);
}

/**
 * Supprime une facture : son rappel part avec elle, et ses quarts se
 * relibèrent — c'est la seule porte de sortie d'un quart verrouillé.
 */
export async function supprimerFactureEtRappel(facture: Facture) {
  await annulerRappel(facture.notification_relance);
  supprimerFacture(facture.id);
}

/** Jours écoulés depuis la génération, pour l'afficher dans la liste. */
export function ancienneteFacture(facture: Facture): number {
  return joursEnAttente(facture);
}

export { relanceDue };

/** Réexpose l'annulation pour les écrans qui n'ont pas à connaître expo-notifications. */
export async function annulerRelance(facture: Facture) {
  await annulerRappel(facture.notification_relance);
  enregistrerRelance(facture.id, null);
}
