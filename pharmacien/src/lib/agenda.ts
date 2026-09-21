import type { Quart } from '../db/types';
import { analyserHeure, decalerHeure, dureeHeures } from './dates';

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

/**
 * Au dépôt, le quart se cale sur l'heure pleine ou la demi-heure. Ce sont les
 * deux seules positions possibles : l'usager fait un geste approximatif,
 * l'application place proprement. Sur un petit écran, viser à la minute
 * transformerait un geste simple en geste de précision.
 */
export const AIMANT_MINUTES = 30;

/** Dernier cran de la journée qui tombe encore sur la grille. */
const DERNIER_CRAN = 24 * 60 - AIMANT_MINUTES;

/** Minutes depuis minuit, ramenées au cran le plus proche et bornées au jour. */
export function aimanter(minutes: number): number {
  const cale = Math.round(minutes / AIMANT_MINUTES) * AIMANT_MINUTES;
  return Math.min(Math.max(cale, 0), DERNIER_CRAN);
}

export function minutesEnHeure(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${`${h}`.padStart(2, '0')}:${`${m}`.padStart(2, '0')}`;
}

/**
 * Où atterrit un quart déposé. La durée ne bouge jamais : c'est elle qu'on
 * conserve, et l'heure de fin s'en déduit. Déplacer un quart de huit heures
 * doit donner un quart de huit heures, minuit traversé ou non.
 */
export function deposerQuart(
  quart: { heure_debut: string; heure_fin: string },
  minutesVisees: number
): { heure_debut: string; heure_fin: string } {
  const debut = aimanter(minutesVisees);
  return {
    heure_debut: minutesEnHeure(debut),
    heure_fin: decalerHeure(minutesEnHeure(debut), dureeHeures(quart.heure_debut, quart.heure_fin)),
  };
}
