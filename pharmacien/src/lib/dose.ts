/**
 * Le calculateur de dose.
 *
 * L'application n'implémente aucun score clinique : elle pointe vers MDCalc.
 * Ceci n'en est pas un. Une dose en millilitres est une multiplication et deux
 * divisions, sur des valeurs que le pharmacien fournit lui-même — il n'y a
 * aucun modèle à tenir à jour, et donc aucune dette.
 *
 * Ce qu'elle ne fait jamais : proposer une posologie. Le champ de dose part
 * vide et le reste. C'est là qu'est le vrai risque — une valeur périmée dans
 * une liste intégrée, recopiée sans réfléchir. Le pharmacien apporte la
 * posologie, l'application fait l'arithmétique.
 *
 * Toute la chaîne se calcule en pleine précision. **Aucune valeur arrondie
 * n'alimente l'étape suivante**, exactement comme pour les montants : arrondir
 * 6,6667 mL à 6,7 avant de multiplier par quinze prises donne 100,5 mL et deux
 * bouteilles au lieu d'une.
 */

/** Une livre vaut ça, et pas 0,45. */
export const KG_PAR_LIVRE = 0.453592;

/**
 * Les deux unités ne se calculent pas pareil, et c'est le point où une erreur
 * donne le tiers ou le triple de la dose.
 *
 * `parJour` — mg/kg/jour — est une dose quotidienne : elle **se divise** par
 * le nombre de prises.
 *
 * `parPrise` — mg/kg/dose — est déjà celle d'une prise : elle **ne se divise
 * pas**. La fréquence sert alors à remonter au total quotidien.
 */
export type UniteDose = 'parJour' | 'parPrise';

export type EntreeDose = {
  /** Toujours en kilogrammes : la conversion se fait avant d'arriver ici. */
  poidsKg: number;
  dose: number;
  unite: UniteDose;
  /** 1, 2, 3 ou 4 : DIE, BID, TID, QID. */
  prises: number;
  concentrationMg: number;
  concentrationMl: number;
  /** Durée du traitement, en jours. Sans elle, pas de quantité à servir. */
  jours?: number | null;
  /** Format de la bouteille, en millilitres. */
  formatMl?: number | null;
  /** Dose maximale quotidienne, en mg. */
  maxParJour?: number | null;
};

export type Alerte =
  | { genre: 'poids' }
  | { genre: 'volume'; volume: number }
  | { genre: 'maximum'; ecart: number };

export type CalculDose = {
  doseParPrise: number;
  doseQuotidienne: number;
  /** En mg/mL. */
  concentration: number;
  volumeParPrise: number;
  /** Ce qu'il faut servir. `null` tant qu'aucune durée n'est saisie. */
  quantiteTotale: number | null;
  /** `null` sans format de bouteille. */
  bouteilles: number | null;
  alertes: Alerte[];
};

/** Bornes du poids au-delà desquelles on demande de vérifier. */
export const POIDS_MIN = 2;
export const POIDS_MAX = 100;
/** Au-delà, une prise unique devient difficile à avaler. */
export const VOLUME_ELEVE = 20;

export function enKilogrammes(valeur: number, unite: 'kg' | 'lb'): number {
  return unite === 'kg' ? valeur : valeur * KG_PAR_LIVRE;
}

export function enLivres(kilogrammes: number): number {
  return kilogrammes / KG_PAR_LIVRE;
}

/**
 * Le calcul, ou `null` quand il ne peut pas se faire.
 *
 * Une concentration à zéro est la seule chose qui bloque : diviser par elle ne
 * donne pas un résultat douteux, il n'en donne aucun. Tout le reste
 * s'affiche, avec ses avertissements.
 */
export function calculerDose(entree: EntreeDose): CalculDose | null {
  const { poidsKg, dose, prises, concentrationMg, concentrationMl } = entree;
  if (concentrationMg <= 0 || concentrationMl <= 0) return null;
  if (poidsKg <= 0 || dose <= 0 || prises <= 0) return null;

  const doseParPrise = entree.unite === 'parJour' ? (poidsKg * dose) / prises : poidsKg * dose;
  const doseQuotidienne =
    entree.unite === 'parJour' ? poidsKg * dose : poidsKg * dose * prises;

  const concentration = concentrationMg / concentrationMl;
  const volumeParPrise = doseParPrise / concentration;

  const jours = entree.jours ?? null;
  const quantiteTotale = jours && jours > 0 ? volumeParPrise * prises * jours : null;

  const format = entree.formatMl ?? null;
  const bouteilles =
    quantiteTotale !== null && format && format > 0
      ? Math.ceil(quantiteTotale / format)
      : null;

  const alertes: Alerte[] = [];
  if (poidsKg < POIDS_MIN || poidsKg > POIDS_MAX) alertes.push({ genre: 'poids' });
  if (volumeParPrise > VOLUME_ELEVE) alertes.push({ genre: 'volume', volume: volumeParPrise });
  const max = entree.maxParJour ?? null;
  if (max && max > 0 && doseQuotidienne > max) {
    alertes.push({ genre: 'maximum', ecart: doseQuotidienne - max });
  }

  return {
    doseParPrise,
    doseQuotidienne,
    concentration,
    volumeParPrise,
    quantiteTotale,
    bouteilles,
    alertes,
  };
}

/** Arrondi d'affichage seulement. Il n'alimente jamais un calcul. */
export function arrondirAffichage(valeur: number, decimales: number): number {
  const facteur = 10 ** decimales;
  return Math.round(valeur * facteur) / facteur;
}

/**
 * La valeur exacte, quand elle diffère de celle qu'on affiche. « 6,7 mL » est
 * ce qu'on lit ; « exact : 6,667 » est ce qu'on vérifie.
 */
export function valeurExacte(valeur: number, decimales = 1): number | null {
  const affichee = arrondirAffichage(valeur, decimales);
  if (Math.abs(valeur - affichee) < 1e-9) return null;
  return arrondirAffichage(valeur, 3);
}

/**
 * Les mots par lesquels on cherche le calculateur. Les deux langues, comme
 * pour les sources : on pense « mg/kg » un jour et « weight-based » le
 * lendemain.
 */
export const MOTS_CLES_DOSE =
  'dose, pédiatrique, mg/kg, suspension, antibiotique, mL, conversion, kg, lb, livres, ' +
  'pediatric dose, weight-based dosing, dosing, millilitres';
