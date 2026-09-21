/**
 * Répétition d'un quart sur plusieurs jours.
 *
 * Les jours se pointent un à un : l'horaire d'un remplaçant est irrégulier, et
 * « tous les lundis » ne décrit presque jamais ce qu'il fait vraiment. Chaque
 * jour retenu donne un quart autonome — aucune série liée, donc modifier ou
 * supprimer l'un ne touche jamais les autres.
 *
 * Un jour qui porte déjà un quart aux mêmes heures est sauté, jamais écrasé,
 * et jamais bloquant : l'usager est prévenu après coup de ce qui a été laissé
 * de côté.
 */

export type RepartitionRecurrence = {
  /** Jours qui donneront un quart, triés. */
  retenus: string[];
  /** Jours laissés de côté parce qu'ils portaient déjà un quart, triés. */
  sautes: string[];
};

export function repartirRecurrence(
  jours: Iterable<string>,
  occupes: ReadonlySet<string>,
  /**
   * Le jour du formulaire, s'il y en a un. Il n'est jamais sauté en silence :
   * l'usager l'a saisi explicitement, et un chevauchement sur ce jour-là lui
   * est déjà posé comme une question, avec ses options.
   */
  obligatoire?: string
): RepartitionRecurrence {
  const uniques = [...new Set(jours)].sort();
  const saute = (jour: string) => jour !== obligatoire && occupes.has(jour);
  return {
    retenus: uniques.filter((jour) => !saute(jour)),
    sautes: uniques.filter(saute),
  };
}

/**
 * Les jours d'une série : celui du formulaire, plus ceux cochés au calendrier.
 * Le jour du formulaire en fait toujours partie, même s'il n'a pas été coché.
 */
export function joursDeLaSerie(dateSource: string, coches: Iterable<string>): string[] {
  return [...new Set([dateSource, ...coches])].sort();
}
