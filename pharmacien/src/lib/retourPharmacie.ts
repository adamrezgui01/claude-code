/**
 * Le passage de la fiche de pharmacie à la fiche du quart, en un seul message.
 *
 * `expo-router` ne sait rien rendre à l'écran précédent : revenir en arrière
 * ne transporte aucune valeur. Rouvrir la fiche du quart avec un paramètre la
 * remonterait à neuf, et tout ce qui avait été dicté serait perdu — c'est
 * exactement ce qu'on cherche à éviter ici. La pharmacie créée dépose donc son
 * identifiant, et la fiche du quart, toujours montée derrière, le reprend en
 * revenant au premier plan.
 *
 * Le message se consomme une seule fois : revenir une seconde fois sur la
 * fiche ne doit pas resélectionner une pharmacie que l'usager vient d'écarter.
 */
let deposee: number | null = null;

export function deposerPharmacieCreee(id: number): void {
  deposee = id;
}

export function reprendrePharmacieCreee(): number | null {
  const id = deposee;
  deposee = null;
  return id;
}
