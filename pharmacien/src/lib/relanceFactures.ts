import { enregistrerRelance, supprimerFacture } from '../db/factures';
import type { Facture } from '../db/types';
import { analyserDate } from './dates';
import { argent } from './format';
import { annulerRappel, planifierRappel } from './notifications';

/**
 * Relance des factures impayées.
 *
 * Pour un travailleur autonome, une facture oubliée est de l'argent réel : un
 * propriétaire laisse passer, et le trou se découvre des mois plus tard. Un
 * rappel unique, doux, part une fois le délai écoulé. Pas de répétition, pas
 * d'insistance.
 */

/** Délai par défaut, en jours. Réglable dans Paramètres. */
export const DELAI_RELANCE_DEFAUT = 30;

/** Rappel à 9 h, le nombre de jours convenu après la génération. */
function instantRelance(facture: Facture, delaiJours: number): Date {
  const base = facture.date_generation
    ? analyserDate(facture.date_generation)
    : new Date(facture.cree_le);
  const rappel = new Date(base.getTime() + delaiJours * 86400000);
  rappel.setHours(9, 0, 0, 0);
  return rappel;
}

function joursDepuis(facture: Facture): number {
  const base = facture.date_generation
    ? analyserDate(facture.date_generation)
    : new Date(facture.cree_le);
  return Math.max(0, Math.round((Date.now() - base.getTime()) / 86400000));
}

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
    'Facture toujours impayée',
    `${facture.pharmacie_nom} — facture ${facture.numero}, ${argent(facture.total)}, en attente depuis ${delaiJours} jours.`,
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
  await programmerRelance(facture, delaiJours);
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
  return joursDepuis(facture);
}

/** Vrai quand le délai est dépassé et que rien n'est entré. */
export function relanceDue(facture: Facture, delaiJours: number): boolean {
  return facture.statut_paiement === 'en_attente' && joursDepuis(facture) >= delaiJours;
}

/** Réexpose l'annulation pour les écrans qui n'ont pas à connaître expo-notifications. */
export async function annulerRelance(facture: Facture) {
  await annulerRappel(facture.notification_relance);
  enregistrerRelance(facture.id, null);
}
