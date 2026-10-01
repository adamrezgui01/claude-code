/**
 * Les formats d'affichage, en français du Québec. Un affichage ne recalcule
 * rien : il reçoit un montant déjà arrondi.
 */

const formateurArgent = new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' });

/** 1234,5 → « 1 234,50 $ ». */
export function argent(montant: number): string {
  return formateurArgent.format(montant);
}

/**
 * 7,5 → « 7 h 30 ». C'est une durée, pas une heure d'horloge : « 7:30 » se
 * lirait comme sept heures et demie du matin.
 */
export function heures(total: number): string {
  const minutes = Math.round(total * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${`${m}`.padStart(2, '0')}`;
}

export function nombre(valeur: number, decimales = 1): string {
  return new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: decimales }).format(valeur);
}

/**
 * Un nombre à décimales fixes : « 10,0 » et non « 10 ». Deux valeurs qu'on
 * compare affichent la même précision.
 */
export function nombreFixe(valeur: number, decimales = 1): string {
  return new Intl.NumberFormat('fr-CA', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(valeur);
}

/**
 * Lit un nombre saisi, virgule décimale comprise. Un champ vide n'est pas
 * zéro : il rend `null`, et c'est le vide qui hérite.
 */
export function lireNombre(texte: string): number | null {
  const nu = texte.replace(/[\s  $]/g, '').replace(',', '.');
  if (nu === '') return null;
  const valeur = Number(nu);
  return Number.isFinite(valeur) ? valeur : null;
}

/** L'inverse : un nombre pour un champ, vide quand il n'y a rien. */
export function ecrireNombre(valeur: number | null): string {
  return valeur === null ? '' : `${valeur}`.replace('.', ',');
}

/** « 09:00 » → « 9 h », « 13:30 » → « 13 h 30 ». */
export function heureLisible(heure: string): string {
  const [h, m] = heure.split(':').map(Number);
  return m === 0 ? `${h} h` : `${h} h ${`${m}`.padStart(2, '0')}`;
}
