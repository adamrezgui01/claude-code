/**
 * Arithmétique d'argent.
 *
 * Un taux au kilomètre est un nombre à décimales, et 80 × 0,55 ne vaut pas
 * exactement 44 en virgule flottante : il vaut 44,00000000000001. Tant que le
 * chiffre n'est qu'affiché, personne ne le voit — mais il finit enregistré
 * dans la base, additionné à d'autres, et deux factures identiques peuvent
 * alors différer d'un centième de cent.
 *
 * Toute somme qui sort d'un calcul passe donc par ici, et revient arrondie au
 * cent. C'est la plus petite unité qui existe sur une facture ; rien en deçà
 * n'a de sens.
 */

/** Convertit en cents entiers. */
export function enCents(montant: number): number {
  // L'epsilon rattrape les valeurs qui tombent juste sous le demi-cent à cause
  // de la représentation binaire — 44,004999999 doit s'arrondir comme 44,005.
  return Math.round((montant + Number.EPSILON * Math.sign(montant || 1)) * 100);
}

export function depuisCents(cents: number): number {
  return cents / 100;
}

/** Une somme, ramenée au cent. */
export function arrondirArgent(montant: number): number {
  return depuisCents(enCents(montant));
}

/** Somme d'une liste de montants, additionnée en cents entiers. */
export function sommeArgent(montants: number[]): number {
  return depuisCents(montants.reduce((total, m) => total + enCents(m), 0));
}

/** Produit d'une quantité par un taux, ramené au cent. */
export function produitArgent(quantite: number, taux: number): number {
  return arrondirArgent(quantite * taux);
}
