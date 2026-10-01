import { normaliser } from './texte';
import type { Pharmacie, Quart } from './types';

/** Retrouver une pharmacie par son nom ou sa ville, sans souci des accents. */
export function filtrerPharmacies(pharmacies: Pharmacie[], recherche: string): Pharmacie[] {
  const terme = normaliser(recherche.trim());
  if (!terme) return pharmacies;
  return pharmacies.filter((p) => normaliser(p.nom).includes(terme) || normaliser(p.ville).includes(terme));
}

export type Tri = 'alphabetique' | 'recentes';

/** Le dernier jour travaillé chez une pharmacie, avant aujourd'hui. */
export function dernierQuart(quarts: Quart[], pharmacieId: number, aujourdhui: string): string | null {
  let dernier: string | null = null;
  for (const q of quarts) {
    if (q.pharmacie_id === pharmacieId && q.date < aujourdhui && (!dernier || q.date > dernier)) dernier = q.date;
  }
  return dernier;
}

/**
 * Les favorites en tête, puis le reste dans l'ordre choisi : de A à Z, ou de
 * la plus récemment travaillée à celle où l'on n'est jamais allé.
 */
export function trierPharmacies(pharmacies: Pharmacie[], tri: Tri, quarts: Quart[], aujourdhui: string): Pharmacie[] {
  const alpha = (a: Pharmacie, b: Pharmacie) => a.nom.localeCompare(b.nom, 'fr-CA');
  const recent = (a: Pharmacie, b: Pharmacie) => {
    const da = dernierQuart(quarts, a.id, aujourdhui) ?? '';
    const db = dernierQuart(quarts, b.id, aujourdhui) ?? '';
    return da === db ? alpha(a, b) : da < db ? 1 : -1;
  };
  return [...pharmacies].sort(
    (a, b) => Number(b.favori) - Number(a.favori) || (tri === 'alphabetique' ? alpha(a, b) : recent(a, b))
  );
}

/** Les quarts d'une pharmacie, du plus récent au plus ancien. */
export function historique(quarts: Quart[], pharmacieId: number): Quart[] {
  return quarts
    .filter((q) => q.pharmacie_id === pharmacieId)
    .sort((a, b) => (a.date === b.date ? b.heure_debut.localeCompare(a.heure_debut) : a.date < b.date ? 1 : -1));
}
