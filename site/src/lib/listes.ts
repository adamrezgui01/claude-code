/** Une liste-section montre trois éléments, puis son contrôle. */
export const VISIBLES = 3;

/**
 * Le mot du contrôle : « Voir les 12 », ou « Réduire ». Le nombre est réel —
 * « Voir plus » ne dit pas si l'on déploie douze lignes ou quarante.
 */
export function libelleControle(total: number, ouvert: boolean): string {
  return ouvert ? 'Réduire' : `Voir les ${total}`;
}
