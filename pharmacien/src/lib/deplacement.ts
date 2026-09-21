import { produitArgent } from './argent';

/**
 * Le kilométrage, et la distinction qui compte le plus ici : une distance de
 * zéro kilomètre n'est pas une distance inconnue.
 *
 * Zéro est une vraie valeur — la pharmacie est au coin de la rue, ou le trajet
 * n'est pas remboursé ce jour-là — et elle vaut 0,00 $. Une distance qui n'a
 * jamais été calculée ne vaut rien du tout : elle ne doit jamais s'afficher
 * comme un zéro, qui aurait l'air d'un fait établi.
 *
 * En base, l'inconnu s'écrit par un nombre négatif, parce que les colonnes
 * existantes n'acceptent pas le nul. Ici, l'inconnu s'écrit `null`, et rien
 * au-dessus de cette frontière n'a à connaître la convention de stockage.
 */

/** Ce qu'on écrit en base pour « pas encore calculée ». */
export const DISTANCE_INCONNUE = -1;

export type EtatDistance = { connue: true; km: number } | { connue: false };

/** Lit une distance stockée. Tout nombre négatif signifie « inconnue ». */
export function lireDistance(valeur: number): number | null {
  return valeur < 0 ? null : valeur;
}

/** Écrit une distance en base, l'inconnu compris. */
export function ecrireDistance(km: number | null): number {
  return km === null ? DISTANCE_INCONNUE : km;
}

export function etatDistance(km: number | null): EtatDistance {
  return km === null ? { connue: false } : { connue: true, km };
}

/** Vrai seulement quand la distance a été établie, zéro inclus. */
export function distanceEtablie(km: number | null): boolean {
  return km !== null;
}

/**
 * Distance réellement parcourue. Le trajet saisi est toujours l'aller simple ;
 * c'est l'interrupteur aller-retour qui décide s'il compte une fois ou deux.
 */
export function distanceFacturable(kmAllerSimple: number | null, allerRetour: boolean): number | null {
  if (kmAllerSimple === null) return null;
  return kmAllerSimple * (allerRetour ? 2 : 1);
}

/**
 * Montant du kilométrage. Une distance inconnue ne vaut pas zéro dollar : elle
 * ne vaut rien, et l'appelant doit le dire autrement qu'avec un montant.
 */
export function montantKilometrage(
  kmAllerSimple: number | null,
  tauxParKm: number,
  allerRetour: boolean
): number | null {
  const km = distanceFacturable(kmAllerSimple, allerRetour);
  if (km === null) return null;
  return produitArgent(km, tauxParKm);
}
