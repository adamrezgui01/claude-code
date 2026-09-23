import { enregistrerRelance, reinitialiserRelance, supprimerFacture } from '../db/factures';
import type { Facture } from '../db/types';
import { texte } from '../i18n';
import { langueCourante } from '../i18n';
import { argent } from './format';
import { annulerRappel, planifierRappel } from './notifications';
import { instantRelance, joursEnAttente, relanceDue } from './relance';

/**
 * Relance des factures impayées.
 *
 * Pour un travailleur autonome, une facture oubliée est de l'argent réel : un
 * propriétaire laisse passer, et le trou se découvre des mois plus tard. Un
 * rappel unique, doux, part une fois le délai écoulé. Pas de répétition, pas
 * d'insistance.
 */

/**
 * Programme la relance d'une facture. Le rappel précédent est annulé d'abord :
 * changer le délai dans Paramètres ne doit pas laisser traîner deux rappels.
 */
export async function programmerRelance(facture: Facture, delaiJours: number) {
  await annulerRappel(facture.notification_relance);
  if (facture.statut_paiement === 'payee' || delaiJours <= 0) {
    enregistrerRelance(facture.id, null);
    return;
  }
  const id = await planifierRappel(
    texte('notifications.relanceTitre'),
    texte('notifications.relanceCorps', {
      pharmacie: facture.pharmacie_nom,
      numero: facture.numero,
      montant: argent(facture.total, langueCourante()),
      jours: delaiJours,
    }),
    instantRelance(facture, delaiJours),
    { factureId: facture.id }
  );
  enregistrerRelance(facture.id, id);
}

/** La facture est payée, ou repasse en attente : le rappel suit. */
export async function ajusterRelance(facture: Facture, delaiJours: number) {
  if (facture.statut_paiement === 'payee') {
    await annulerRappel(facture.notification_relance);
    enregistrerRelance(facture.id, null);
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
