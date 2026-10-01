import type { Pharmacie, Quart, Reglages } from './types';

/**
 * Zéro est une valeur ; seul le vide hérite. Une pharmacie qui ne paie pas le
 * kilométrage porte 0, et ce 0 ne doit jamais céder la place aux 0,55 $ des
 * réglages.
 */
export function valeur<T>(propre: T | null | undefined, heritee: T): T {
  return propre === null || propre === undefined ? heritee : propre;
}

/**
 * Les chiffres qu'un nouveau quart fige, pris à la pharmacie, sinon aux
 * réglages. Après sa création, ils ne bougent plus.
 */
export function conditionsDuQuart(
  pharmacie: Pharmacie,
  reglages: Reglages
): Pick<Quart, 'taux_horaire' | 'taux_par_km' | 'kilometrage' | 'aller_retour' | 'per_diem' | 'pause_minutes'> {
  return {
    taux_horaire: valeur(pharmacie.taux_horaire, reglages.taux_horaire),
    taux_par_km: valeur(pharmacie.taux_par_km, reglages.taux_par_km),
    kilometrage: pharmacie.distance_km,
    aller_retour: pharmacie.aller_retour,
    per_diem: valeur(pharmacie.per_diem, reglages.per_diem),
    pause_minutes: reglages.pause_minutes,
  };
}
