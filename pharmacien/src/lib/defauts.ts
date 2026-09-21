import type { ModeDeplacement, Pharmacie, Reglages } from '../db/types';
import { DISTANCE_INCONNUE, lireDistance } from './deplacement';

/**
 * La chaîne des valeurs par défaut : réglages généraux, puis pharmacie, puis
 * quart. Chaque étage recopie l'étage du dessus au moment où il est créé, et
 * ne le regarde plus jamais ensuite.
 *
 * C'est la règle importante, et c'est celle qu'on oublie : changer le taux
 * d'une pharmacie ne doit rien faire aux quarts déjà entrés. Une facture
 * envoyée il y a trois mois ne se réécrit pas parce qu'une entente a changé
 * depuis. Chaque quart porte donc ses propres chiffres, figés le jour où il a
 * été créé.
 */

/** Ce qu'une nouvelle fiche de pharmacie reprend des réglages généraux. */
export function defautsPharmacie(reglages: Pick<Reglages, 'taux_par_km'>): {
  taux_par_km: number;
  distance_km: number;
} {
  return { taux_par_km: reglages.taux_par_km, distance_km: DISTANCE_INCONNUE };
}

export type DefautsQuart = {
  taux_horaire: number;
  taux_par_km: number;
  /** Aller simple, en kilomètres. `null` tant qu'elle n'a pas été établie. */
  kilometrage: number | null;
  montant_fixe_deplacement: number;
  per_diem_reclame: number;
  pause_minutes: number;
  pause_payee: number;
  mode_deplacement: ModeDeplacement;
};

/**
 * Ce qu'un nouveau quart reprend de sa pharmacie. Le taux au kilomètre en fait
 * partie : sans lui, le quart irait le rechercher sur la fiche au moment de
 * facturer, et une modification de la fiche changerait rétroactivement des
 * quarts vieux de plusieurs mois.
 */
export function defautsQuart(pharmacie: Pharmacie): DefautsQuart {
  return {
    taux_horaire: pharmacie.taux_horaire,
    taux_par_km: pharmacie.taux_par_km,
    kilometrage:
      pharmacie.mode_deplacement === 'km' ? lireDistance(pharmacie.distance_km) : null,
    montant_fixe_deplacement:
      pharmacie.mode_deplacement === 'fixe' ? pharmacie.montant_fixe_deplacement : 0,
    per_diem_reclame: pharmacie.per_diem,
    pause_minutes: pharmacie.pause_minutes,
    pause_payee: pharmacie.pause_payee,
    mode_deplacement: pharmacie.mode_deplacement,
  };
}

/**
 * Hébergement facturable. Un logement fourni par la pharmacie n'entre nulle
 * part : rien n'est payé, donc rien n'est facturé, et rien n'est compté. C'est
 * une note pour soi, pas une ligne.
 */
export function montantHebergement(
  pharmacie: Pick<Pharmacie, 'hebergement_montant' | 'hebergement_fourni'>
): number {
  return pharmacie.hebergement_fourni ? 0 : pharmacie.hebergement_montant;
}
