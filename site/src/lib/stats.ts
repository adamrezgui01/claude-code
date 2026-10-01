import { sommeArgent } from './argent';
import { montantsDuQuart } from './montants';
import type { Pharmacie, Quart } from './types';

/**
 * Les totaux d'une période. Ils additionnent des montants déjà arrondis, quart
 * par quart ; ils ne repartent jamais des taux et des distances.
 */
export type Statistiques = {
  nombreQuarts: number;
  heures: number;
  honoraires: number;
  deplacement: number;
  perDiem: number;
  revenu: number;
  km: number;
  parPharmacie: { pharmacie_id: number; nom: string; quarts: number; heures: number; revenu: number }[];
};

export function calculerStatistiques(quarts: Quart[], pharmacies: Pharmacie[]): Statistiques {
  const montants = quarts.map((q) => ({ q, m: montantsDuQuart(q) }));
  const groupes = new Map<number, typeof montants>();
  for (const e of montants) groupes.set(e.q.pharmacie_id, [...(groupes.get(e.q.pharmacie_id) ?? []), e]);

  return {
    nombreQuarts: quarts.length,
    heures: montants.reduce((t, { m }) => t + m.heures, 0),
    honoraires: sommeArgent(montants.map(({ m }) => m.honoraires)),
    deplacement: sommeArgent(montants.map(({ m }) => m.kilometrage ?? 0)),
    perDiem: sommeArgent(montants.map(({ m }) => m.perDiem)),
    revenu: sommeArgent(montants.map(({ m }) => m.total)),
    km: montants.reduce((t, { m }) => t + m.km, 0),
    parPharmacie: [...groupes.entries()]
      .map(([id, lot]) => ({
        pharmacie_id: id,
        nom: pharmacies.find((p) => p.id === id)?.nom ?? 'Pharmacie retirée',
        quarts: lot.length,
        heures: lot.reduce((t, { m }) => t + m.heures, 0),
        revenu: sommeArgent(lot.map(({ m }) => m.total)),
      }))
      .sort((a, b) => b.revenu - a.revenu || a.nom.localeCompare(b.nom, 'fr-CA')),
  };
}
