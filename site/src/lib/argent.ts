/**
 * Arithmétique d'argent, la même que dans l'application.
 *
 * 80 × 0,55 ne vaut pas exactement 44 en virgule flottante. Toute somme qui
 * sort d'un calcul revient donc arrondie au cent, la plus petite unité qui
 * existe sur une facture.
 */

/** En cents entiers, la demie exacte vers le haut. */
export function enCents(montant: number): number {
  // L'epsilon rattrape 44,004999999… qui doit s'arrondir comme 44,005.
  return Math.round((montant + Number.EPSILON * Math.sign(montant || 1)) * 100);
}

export function arrondirArgent(montant: number): number {
  return enCents(montant) / 100;
}

/** Une somme de montants déjà arrondis, additionnée en cents entiers. */
export function sommeArgent(montants: number[]): number {
  return montants.reduce((total, m) => total + enCents(m), 0) / 100;
}

/** Une quantité par un taux, ramenée au cent. */
export function produitArgent(quantite: number, taux: number): number {
  return arrondirArgent(quantite * taux);
}
