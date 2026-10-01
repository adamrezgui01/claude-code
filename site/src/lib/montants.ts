import { produitArgent, sommeArgent, arrondirArgent } from './argent';
import { dureeHeures } from './temps';
import type { Quart } from './types';

/**
 * Ce qu'un quart vaut. Un montant se calcule et s'arrondit **une seule fois**,
 * ici, élément par élément. Les statistiques et les factures additionnent ces
 * montants déjà arrondis ; elles ne repartent jamais des taux et des
 * distances.
 */
export type Montants = {
  /** Heures facturables, pause déduite. */
  heures: number;
  honoraires: number;
  /** `null` quand la distance n'a jamais été établie — ce n'est pas zéro. */
  kilometrage: number | null;
  /** Kilomètres parcourus, aller-retour compris. */
  km: number;
  perDiem: number;
  total: number;
};

export function heuresDuQuart(quart: Pick<Quart, 'heure_debut' | 'heure_fin' | 'pause_minutes'>): number {
  return Math.max(0, dureeHeures(quart.heure_debut, quart.heure_fin) - quart.pause_minutes / 60);
}

export function montantsDuQuart(quart: Quart): Montants {
  const heures = heuresDuQuart(quart);
  const honoraires = produitArgent(heures, quart.taux_horaire);
  const km = quart.kilometrage === null ? 0 : quart.kilometrage * (quart.aller_retour ? 2 : 1);
  const kilometrage = quart.kilometrage === null ? null : produitArgent(km, quart.taux_par_km);
  const perDiem = arrondirArgent(quart.per_diem);
  return {
    heures,
    honoraires,
    kilometrage,
    km,
    perDiem,
    total: sommeArgent([honoraires, kilometrage ?? 0, perDiem]),
  };
}
