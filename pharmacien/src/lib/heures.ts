import type { Quart } from '../db/types';
import { dureeHeures } from './dates';

/**
 * Les heures d'un quart. Posé tout en bas de la pile : les montants en
 * dépendent, les statistiques dépendent des montants, et rien ici ne dépend
 * de personne.
 */

/**
 * Heures effectivement travaillées : les heures réelles si l'usager les a
 * corrigées, les heures prévues sinon, moins la pause repas si elle n'est pas
 * payée.
 */
export function heuresTravaillees(quart: Quart): number {
  if (quart.annule) return 0;
  const debut = quart.heure_debut_reelle || quart.heure_debut;
  const fin = quart.heure_fin_reelle || quart.heure_fin;
  const brut = dureeHeures(debut, fin);
  const pause = quart.pause_payee ? 0 : quart.pause_minutes / 60;
  return Math.max(0, brut - pause);
}

export function quartCompte(quart: Quart): boolean {
  return !quart.annule;
}
