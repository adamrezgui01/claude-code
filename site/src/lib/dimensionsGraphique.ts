/**
 * Les dimensions du graphique. recharts dessine en SVG à partir de nombres, et
 * une variable CSS n'y entre pas : c'est le seul endroit, hors de jetons.css,
 * où une dimension s'écrit en valeur. Celles qui existent aussi dans les jetons
 * leur sont égales, et un test le vérifie.
 */
export const GRAPHIQUE = {
  hauteur: 220,
  /**
   * La colonne de l'axe vertical : assez pour « 11k » ou « 152 h » en
   * Caption 1, pas davantage — chaque pixel pris ici manque aux douze
   * colonnes, et à 390 pixels de large « 9,5k » n'y entrait plus.
   */
  axe: 36,
  /** L'air au-dessus de la plus haute barre, pour son étiquette (= --espace-5). */
  margeHaute: 20,
  /** Coins du haut arrondis (= --barre-rayon). */
  rayonBarre: 4,
  /** Deux pixels au moins, pour qu'un mois à zéro se voie encore. */
  barreMinimum: 2,
} as const;
