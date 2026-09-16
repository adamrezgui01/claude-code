import type { Quart } from '../db/types';
import { analyserHeure, dureeHeures } from './dates';

/**
 * Calcul de la fenêtre d'heures des vues jour et semaine. Vit ici, sans
 * dépendance native, pour être vérifiable hors application.
 */

/** Marge vide avant le premier quart et après le dernier. */
export const MARGE_MINUTES = 30;
/** En deçà, les blocs deviennent illisibles : la vue défile plutôt que d'écraser. */
export const PX_PAR_HEURE_MIN = 34;
export const PX_PAR_HEURE_MAX = 90;
/** Journée sans quart. */
export const FENETRE_DEFAUT = { debut: 8 * 60, fin: 18 * 60 };
/** Amplitude minimale, pour qu'un quart court ne remplisse pas tout l'écran. */
const AMPLITUDE_MIN = 120;

export function minutesDebut(q: Quart): number {
  const { h, min } = analyserHeure(q.heure_debut_reelle || q.heure_debut);
  return h * 60 + min;
}

export function minutesFin(q: Quart): number {
  const debut = q.heure_debut_reelle || q.heure_debut;
  const fin = q.heure_fin_reelle || q.heure_fin;
  return minutesDebut(q) + dureeHeures(debut, fin) * 60;
}

/**
 * Fenêtre resserrée autour des quarts affichés, avec une demi-heure de marge de
 * part et d'autre. En vue semaine, toutes les colonnes la partagent : sinon les
 * lignes des heures ne s'aligneraient plus d'une colonne à l'autre.
 */
export function fenetreHeures(quarts: Quart[]): { debut: number; fin: number } {
  if (quarts.length === 0) return FENETRE_DEFAUT;
  const debut = Math.max(0, Math.min(...quarts.map(minutesDebut)) - MARGE_MINUTES);
  const fin = Math.min(24 * 60, Math.max(...quarts.map(minutesFin)) + MARGE_MINUTES);
  return fin - debut < AMPLITUDE_MIN ? { debut, fin: debut + AMPLITUDE_MIN } : { debut, fin };
}

/**
 * Échelle unique pour toute la vue : les proportions restent vraies, un quart
 * de huit heures reste deux fois plus haut qu'un quart de quatre. La fenêtre
 * s'étire sur la hauteur libre, dans des bornes qui gardent les blocs lisibles ;
 * au-delà, la vue défile.
 */
export function pixelsParHeure(
  fenetre: { debut: number; fin: number },
  hauteurDisponible: number
): number {
  const heuresVisibles = Math.max((fenetre.fin - fenetre.debut) / 60, 1);
  return Math.min(
    PX_PAR_HEURE_MAX,
    Math.max(PX_PAR_HEURE_MIN, hauteurDisponible / heuresVisibles)
  );
}
