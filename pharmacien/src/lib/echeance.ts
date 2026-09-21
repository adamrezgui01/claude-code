import type { Quart } from '../db/types';
import { combiner, dureeHeures } from './dates';

/**
 * Où en est un quart par rapport à maintenant, et à quel point il presse.
 *
 * Ces deux questions vivaient dans l'écran Horaire, mêlées au rendu. Elles
 * n'ont rien de visuel : ce sont des règles sur des instants, et elles se
 * vérifient sans écran.
 */

export type EtatQuart = 'enCours' | 'aVenir' | 'anterieur';

/** Début du quart, comme instant local. */
export function debutDuQuart(quart: Pick<Quart, 'date' | 'heure_debut'>): Date {
  return combiner(quart.date, quart.heure_debut);
}

/**
 * Fin du quart, comme instant local. Un quart de nuit se termine le lendemain,
 * et la durée le dit déjà : on repart du début et on ajoute la durée, plutôt
 * que de recoller une date à l'heure de fin.
 */
export function finDuQuartInstant(
  quart: Pick<Quart, 'date' | 'heure_debut' | 'heure_fin'>
): Date {
  const debut = debutDuQuart(quart);
  return new Date(debut.getTime() + dureeHeures(quart.heure_debut, quart.heure_fin) * 3600000);
}

/**
 * Un quart est antérieur dès qu'il est fini, pas dès que sa date est passée.
 * La nuance n'est pas théorique : à 18 h, un quart du jour même qui s'est
 * terminé à 17 h est derrière soi, et le laisser dans « À venir » le remonte
 * en tête d'une liste où il n'a plus rien à faire.
 */
export function etatQuart(
  quart: Pick<Quart, 'date' | 'heure_debut' | 'heure_fin' | 'annule'>,
  maintenant: number
): EtatQuart {
  const debut = debutDuQuart(quart).getTime();
  const fin = finDuQuartInstant(quart).getTime();
  // Un quart annulé n'est jamais « en cours » : il n'a pas lieu.
  if (!quart.annule && debut <= maintenant && fin > maintenant) return 'enCours';
  return fin <= maintenant ? 'anterieur' : 'aVenir';
}

/** Heures restantes avant le début. Négatif si le quart a commencé. */
export function heuresAvant(
  quart: Pick<Quart, 'date' | 'heure_debut'>,
  maintenant: number
): number {
  return (debutDuQuart(quart).getTime() - maintenant) / 3600000;
}

export type Urgence = 'urgent' | 'proche' | 'lointain';

/** Deux jours : le délai en deçà duquel un quart se prépare maintenant. */
const SEUIL_URGENT_HEURES = 48;
/** Deux semaines : au-delà, c'est un projet, pas une échéance. */
const SEUIL_PROCHE_HEURES = 14 * 24;

/**
 * Trois paliers pour la carte. Les bornes appartiennent au palier le plus
 * pressant : à exactement 48 h, le quart est encore rouge.
 */
export function urgenceQuart(heuresRestantes: number): Urgence {
  if (heuresRestantes <= SEUIL_URGENT_HEURES) return 'urgent';
  if (heuresRestantes <= SEUIL_PROCHE_HEURES) return 'proche';
  return 'lointain';
}
