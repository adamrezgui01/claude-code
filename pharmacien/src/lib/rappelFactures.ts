import { compterFacturesEnAttente } from '../db/factures';
import { definirReglage } from '../db/profil';
import type { Reglages } from '../db/types';
import { ajouterJours, aujourdhui } from './dates';

/**
 * L'application ne sait pas quand l'argent entre. Une pastille permanente
 * resterait rouge pour rien ; on passe donc par un bandeau, mensuel, qui se
 * reporte d'une semaine si l'usager n'a pas le temps.
 */
const RYTHME_JOURS = 30;
const REPORT_JOURS = 7;

export function doitRappelerFactures(reglages: Reglages): boolean {
  if (compterFacturesEnAttente() === 0) return false;
  if (!reglages.dernier_rappel_factures) return true;
  return aujourdhui() >= reglages.dernier_rappel_factures;
}

/** L'usager remet à plus tard : le bandeau revient dans une semaine. */
export function reporterRappelFactures() {
  definirReglage('dernier_rappel_factures', ajouterJours(aujourdhui(), REPORT_JOURS));
}

/** L'usager est allé voir ses factures : retour au rythme mensuel. */
export function rappelFacturesTraite() {
  definirReglage('dernier_rappel_factures', ajouterJours(aujourdhui(), RYTHME_JOURS));
}
