/**
 * Le calculateur de dose, repris de l'application.
 *
 * Ce n'est pas un score clinique : une dose en millilitres est une
 * multiplication et deux divisions, sur des valeurs que le pharmacien fournit
 * lui-même. Le champ de dose part vide et le reste — l'outil ne propose aucune
 * posologie.
 *
 * Toute la chaîne se calcule en pleine précision. **Aucune valeur arrondie
 * n'alimente l'étape suivante** : arrondir 6,6667 mL à 6,7 avant de multiplier
 * par quinze prises donne 100,5 mL et deux bouteilles au lieu d'une.
 */

/** Une livre vaut ça, et pas 0,45. */
export const KG_PAR_LIVRE = 0.453592;

/**
 * `parJour` — mg/kg/jour — est une dose quotidienne : elle **se divise** par le
 * nombre de prises. `parPrise` — mg/kg/dose — est déjà celle d'une prise : elle
 * **ne se divise pas**, et la fréquence sert à remonter au total quotidien.
 * C'est le point où une erreur donne le tiers ou le triple de la dose.
 */
export type UniteDose = 'parJour' | 'parPrise';

export type EntreeDose = {
  /** Toujours en kilogrammes : la conversion se fait avant. */
  poidsKg: number;
  dose: number;
  unite: UniteDose;
  /** 1, 2, 3 ou 4 : DIE, BID, TID, QID. */
  prises: number;
  concentrationMg: number;
  concentrationMl: number;
  jours?: number | null;
  formatMl?: number | null;
  /** Dose maximale quotidienne, en mg. */
  maxParJour?: number | null;
};

export type Alerte = { genre: 'poids' } | { genre: 'volume'; volume: number } | { genre: 'maximum'; ecart: number };

/** Ce que la dose maximale saisie donnerait, quand le calcul la dépasse. */
export type Depassement = { ecart: number; doseParPrise: number; volumeParPrise: number };

export type CalculDose = {
  doseParPrise: number;
  doseQuotidienne: number;
  /** En mg/mL. */
  concentration: number;
  volumeParPrise: number;
  quantiteTotale: number | null;
  bouteilles: number | null;
  depassement: Depassement | null;
  alertes: Alerte[];
};

export const POIDS_MIN = 2;
export const POIDS_MAX = 100;
export const VOLUME_ELEVE = 20;

export function enKilogrammes(valeur: number, unite: 'kg' | 'lb'): number {
  return unite === 'kg' ? valeur : valeur * KG_PAR_LIVRE;
}

export function enLivres(kilogrammes: number): number {
  return kilogrammes / KG_PAR_LIVRE;
}

/** Le calcul, ou `null` quand il ne peut pas se faire. */
export function calculerDose(entree: EntreeDose): CalculDose | null {
  const { poidsKg, dose, prises, concentrationMg, concentrationMl } = entree;
  if (concentrationMg <= 0 || concentrationMl <= 0) return null;
  if (poidsKg <= 0 || dose <= 0 || prises <= 0) return null;

  const doseParPrise = entree.unite === 'parJour' ? (poidsKg * dose) / prises : poidsKg * dose;
  const doseQuotidienne = entree.unite === 'parJour' ? poidsKg * dose : poidsKg * dose * prises;
  const concentration = concentrationMg / concentrationMl;
  const volumeParPrise = doseParPrise / concentration;

  const jours = entree.jours ?? null;
  const quantiteTotale = jours && jours > 0 ? volumeParPrise * prises * jours : null;
  const format = entree.formatMl ?? null;
  const bouteilles = quantiteTotale !== null && format && format > 0 ? Math.ceil(quantiteTotale / format) : null;

  const alertes: Alerte[] = [];
  if (poidsKg < POIDS_MIN || poidsKg > POIDS_MAX) alertes.push({ genre: 'poids' });
  if (volumeParPrise > VOLUME_ELEVE) alertes.push({ genre: 'volume', volume: volumeParPrise });

  // La comparaison porte sur la dose **quotidienne**, dans les deux unités :
  // en mg/kg/dose, la comparer à la dose par prise laisserait passer le triple.
  const max = entree.maxParJour ?? null;
  let depassement: Depassement | null = null;
  if (max && max > 0 && doseQuotidienne > max) {
    const maxParPrise = max / prises;
    depassement = { ecart: doseQuotidienne - max, doseParPrise: maxParPrise, volumeParPrise: maxParPrise / concentration };
    alertes.push({ genre: 'maximum', ecart: depassement.ecart });
  }

  return { doseParPrise, doseQuotidienne, concentration, volumeParPrise, quantiteTotale, bouteilles, depassement, alertes };
}

/** Arrondi d'affichage seulement. Il n'alimente jamais un calcul. */
export function arrondirAffichage(valeur: number, decimales: number): number {
  const facteur = 10 ** decimales;
  return Math.round(valeur * facteur) / facteur;
}

/** La valeur exacte, quand elle diffère de celle qu'on affiche : « 6,7 mL », exact 6,667. */
export function valeurExacte(valeur: number, decimales = 1): number | null {
  const affichee = arrondirAffichage(valeur, decimales);
  if (Math.abs(valeur - affichee) < 1e-9) return null;
  return arrondirAffichage(valeur, 3);
}

/**
 * Les étapes de la chaîne, dans l'ordre où le calcul les fait vraiment. En
 * mg/kg/jour, le poids fois la dose donne la dose du jour, qu'on divise par
 * les prises. En mg/kg/dose, il donne la dose d'une prise, qu'on multiplie par
 * les prises pour le total du jour. Une étape qui écrirait « 18 kg × 10 » à
 * côté de « 720 mg par jour » serait fausse sous les yeux du pharmacien.
 */
export type Etape = { operation: string; resultat: number; unite: 'mg/jour' | 'mg/prise' };

export function etapesDeLaDose(
  r: Pick<CalculDose, 'doseParPrise' | 'doseQuotidienne'>,
  unite: UniteDose,
  prises: number
): [Etape, Etape] {
  return unite === 'parJour'
    ? [
        { operation: 'poids × dose', resultat: r.doseQuotidienne, unite: 'mg/jour' },
        { operation: `÷ ${prises} prise${prises > 1 ? 's' : ''}`, resultat: r.doseParPrise, unite: 'mg/prise' },
      ]
    : [
        { operation: 'poids × dose', resultat: r.doseParPrise, unite: 'mg/prise' },
        { operation: `× ${prises} prise${prises > 1 ? 's' : ''}`, resultat: r.doseQuotidienne, unite: 'mg/jour' },
      ];
}

/** Les mots par lesquels on cherche le calculateur, dans les deux langues. */
export const MOTS_CLES_DOSE =
  'dose, pédiatrique, mg/kg, suspension, antibiotique, mL, conversion, kg, lb, livres, ' +
  'pediatric dose, weight-based dosing, dosing, millilitres';

/** L'ordre des champs obligatoires : Entrée passe au prochain encore vide. */
export type ChampDose = 'poids' | 'dose' | 'concentrationMg' | 'concentrationMl';
export const CHAINE: ChampDose[] = ['poids', 'dose', 'concentrationMg', 'concentrationMl'];

export function prochainChamp(courant: ChampDose, valeurs: Record<ChampDose, string>): ChampDose | null {
  const depart = CHAINE.indexOf(courant);
  if (depart === -1) return null;
  return CHAINE.slice(depart + 1).find((champ) => !valeurs[champ].trim()) ?? null;
}
