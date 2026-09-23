/**
 * Un nombre qu'on règle par pas, entre deux bornes.
 *
 * On applique le pas, puis on ramène dans les bornes. L'inverse — ramener
 * d'abord, puis ajouter — ferait sauter de zéro à deux quand la valeur
 * enregistrée est hors bornes, et ça se voit sans s'expliquer.
 */
export function ajusterCompteur(valeur: number, pas: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(valeur) + pas));
}
