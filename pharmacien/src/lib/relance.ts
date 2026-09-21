import type { Facture } from '../db/types';
import { analyserDate } from './dates';

/**
 * Quand relancer une facture impayée.
 *
 * Pour un travailleur autonome, une facture oubliée est de l'argent réel : un
 * propriétaire laisse passer, et le trou se découvre des mois plus tard. Un
 * rappel unique, doux, part une fois le délai écoulé. Pas de répétition, pas
 * d'insistance — d'où le drapeau qui retient qu'il est déjà parti.
 *
 * Aucune dépendance au système de notifications ici : ce fichier ne dit que
 * s'il faut relancer, pas comment.
 */

/** Délai par défaut, en jours. Réglable dans Paramètres. */
export const DELAI_RELANCE_DEFAUT = 30;

type FactureRelancable = Pick<
  Facture,
  'statut_paiement' | 'date_generation' | 'cree_le' | 'relance_faite'
>;

function instantGeneration(facture: Pick<Facture, 'date_generation' | 'cree_le'>): number {
  return facture.date_generation
    ? analyserDate(facture.date_generation).getTime()
    : new Date(facture.cree_le).getTime();
}

/** Jours écoulés depuis la génération. */
export function joursEnAttente(
  facture: Pick<Facture, 'date_generation' | 'cree_le'>,
  maintenant = Date.now()
): number {
  return Math.max(0, Math.floor((maintenant - instantGeneration(facture)) / 86400000));
}

/**
 * Une relance est due quand la facture est toujours en attente, que le délai
 * est dépassé, et qu'aucun rappel n'est encore parti pour elle.
 *
 * Un délai de zéro éteint la relance : c'est la façon de ne jamais être
 * relancé sans avoir à désactiver quoi que ce soit d'autre.
 */
export function relanceDue(
  facture: FactureRelancable,
  delaiJours: number,
  maintenant = Date.now()
): boolean {
  if (delaiJours <= 0) return false;
  if (facture.statut_paiement !== 'en_attente') return false;
  if (facture.relance_faite) return false;
  return joursEnAttente(facture, maintenant) >= delaiJours;
}

/** Instant du rappel : à 9 h, le nombre de jours convenu après la génération. */
export function instantRelance(
  facture: Pick<Facture, 'date_generation' | 'cree_le'>,
  delaiJours: number
): Date {
  const rappel = new Date(instantGeneration(facture) + delaiJours * 86400000);
  rappel.setHours(9, 0, 0, 0);
  return rappel;
}
