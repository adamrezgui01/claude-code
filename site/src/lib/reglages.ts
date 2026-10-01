import { ecrireNombre, lireNombre } from './format';
import type { Reglages } from './types';

/**
 * Les valeurs par défaut sont le sommet de la hiérarchie : une pharmacie hérite
 * d'elles, un quart hérite de la pharmacie. Zéro y est une valeur ; le vide,
 * non — rien au-dessus ne viendrait le remplacer.
 */
export type SaisieDefauts = { taux_horaire: string; taux_par_km: string; per_diem: string; pause_minutes: string };

export function saisieDesDefauts(r: Reglages): SaisieDefauts {
  return {
    taux_horaire: ecrireNombre(r.taux_horaire),
    taux_par_km: ecrireNombre(r.taux_par_km),
    per_diem: ecrireNombre(r.per_diem),
    pause_minutes: ecrireNombre(r.pause_minutes),
  };
}

export function defautsDepuisSaisie(
  s: SaisieDefauts
): { defauts: Pick<Reglages, 'taux_horaire' | 'taux_par_km' | 'per_diem' | 'pause_minutes'> } | { erreur: string } {
  const valeurs = {
    taux_horaire: lireNombre(s.taux_horaire),
    taux_par_km: lireNombre(s.taux_par_km),
    per_diem: lireNombre(s.per_diem),
    pause_minutes: lireNombre(s.pause_minutes),
  };
  if (Object.values(valeurs).some((v) => v === null)) {
    return { erreur: 'Une valeur par défaut ne peut pas rester vide : rien au-dessus d’elle ne la remplacerait. Zéro est permis.' };
  }
  if (Object.values(valeurs).some((v) => (v as number) < 0)) return { erreur: 'Une valeur par défaut ne peut pas être négative.' };
  return { defauts: valeurs as Pick<Reglages, 'taux_horaire' | 'taux_par_km' | 'per_diem' | 'pause_minutes'> };
}
